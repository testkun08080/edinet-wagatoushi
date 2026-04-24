#!/usr/bin/env python3
"""
EDINET の日次データを取得し、D1 互換 SQLite スキーマへ UPSERT する。

主用途:
- 日次で annual/quarterly/semiannual/large_holding を取得
- raw/{docType}/{year}/{month}/{edinetCode}/ に生ファイルを保存
- companies/documents/period_financials/raw_files_index/pipeline_runs を更新
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sqlite3
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Iterable

from loguru import logger
import polars as pl

from edinet_wrapper import Downloader, parse_tsv

DOC_TYPES_DEFAULT = ("annual", "quarterly", "semiannual", "large_holding")
RAW_FILE_TYPES = ("tsv", "pdf", "json")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fetch daily EDINET data into D1-compatible SQLite DB")
    parser.add_argument("--target_date", type=str, default="", help="YYYY-MM-DD, default is yesterday in JST")
    parser.add_argument("--doc_types", type=str, default=",".join(DOC_TYPES_DEFAULT), help="Comma-separated doc types")
    parser.add_argument("--db_path", type=Path, default=Path("state/edinet_pipeline.db"))
    parser.add_argument("--schema_path", type=Path, default=Path("sql/d1_schema.sql"))
    parser.add_argument("--raw_root", type=Path, default=Path("raw"))
    parser.add_argument("--scope", type=str, default="daily")
    parser.add_argument("--listed_only", action="store_true")
    parser.add_argument("--request_delay", type=float, default=None)
    return parser.parse_args()


def resolve_target_date(raw_target_date: str) -> date:
    if raw_target_date:
        return datetime.strptime(raw_target_date, "%Y-%m-%d").date()
    jst_today = datetime.utcnow() + timedelta(hours=9)
    return (jst_today - timedelta(days=1)).date()


def parse_doc_types(raw_doc_types: str) -> set[str]:
    values = {v.strip() for v in raw_doc_types.split(",") if v.strip()}
    if not values:
        return set(DOC_TYPES_DEFAULT)
    return values


def apply_schema(conn: sqlite3.Connection, schema_path: Path) -> None:
    sql = schema_path.read_text(encoding="utf-8")
    conn.executescript(sql)


def compute_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def upsert_company(conn: sqlite3.Connection, downloader: Downloader, edinet_code: str, sec_code: str, filer_name: str) -> None:
    row = downloader.edinet_code_info.filter(pl.col("ＥＤＩＮＥＴコード") == edinet_code)
    listed_category = None
    industry = None
    if row.height > 0:
        listed_category = row["上場区分"][0]
        industry = row["提出者業種"][0]
    conn.execute(
        """
        INSERT INTO companies (edinet_code, sec_code, filer_name, listed_category, industry)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(edinet_code) DO UPDATE SET
          sec_code=excluded.sec_code,
          filer_name=excluded.filer_name,
          listed_category=excluded.listed_category,
          industry=excluded.industry,
          updated_at=CURRENT_TIMESTAMP
        """,
        (edinet_code, sec_code, filer_name, listed_category, industry),
    )


def upsert_document(conn: sqlite3.Connection, result, doc_type: str) -> None:
    conn.execute(
        """
        INSERT INTO documents (
          doc_id, edinet_code, sec_code, doc_type, ordinance_code, form_code, doc_type_code,
          period_start, period_end, submit_date_time, withdrawal_status, doc_description, source_meta_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(doc_id) DO UPDATE SET
          sec_code=excluded.sec_code,
          doc_type=excluded.doc_type,
          ordinance_code=excluded.ordinance_code,
          form_code=excluded.form_code,
          doc_type_code=excluded.doc_type_code,
          period_start=excluded.period_start,
          period_end=excluded.period_end,
          submit_date_time=excluded.submit_date_time,
          withdrawal_status=excluded.withdrawal_status,
          doc_description=excluded.doc_description,
          source_meta_json=excluded.source_meta_json,
          updated_at=CURRENT_TIMESTAMP
        """,
        (
            result.docID,
            result.edinetCode,
            (result.secCode or "").lstrip("0") or (result.secCode or ""),
            doc_type,
            result.ordinanceCode,
            result.formCode,
            result.docTypeCode,
            result.periodStart,
            result.periodEnd,
            result.submitDateTime,
            result.withdrawalStatus,
            result.docDescription,
            json.dumps(result.to_dict(), ensure_ascii=False),
        ),
    )


def upsert_raw_file_index(conn: sqlite3.Connection, doc_id: str, edinet_code: str, doc_type: str, file_type: str, path: Path) -> None:
    file_id = f"{doc_id}:{file_type}"
    conn.execute(
        """
        INSERT INTO raw_files_index (file_id, doc_id, edinet_code, doc_type, file_type, object_key, file_hash, file_size_bytes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(file_id) DO UPDATE SET
          object_key=excluded.object_key,
          file_hash=excluded.file_hash,
          file_size_bytes=excluded.file_size_bytes
        """,
        (
            file_id,
            doc_id,
            edinet_code,
            doc_type,
            file_type,
            path.as_posix(),
            compute_sha256(path),
            path.stat().st_size,
        ),
    )


def to_flat_dict(d: dict) -> dict:
    out: dict[str, str | None] = {}
    for key, value in d.items():
        if isinstance(value, dict):
            for period_key in ("CurrentQuarter", "CurrentYTD", "CurrentYear", "Interim", "Prior1Interim", "Prior1Quarter", "Prior1YTD", "Prior1Year"):
                if period_key in value and value[period_key] not in ("", None):
                    out[key] = str(value[period_key])
                    break
            else:
                first_value = next((v for v in value.values() if v not in ("", None)), None)
                out[key] = str(first_value) if first_value is not None else None
        else:
            out[key] = str(value) if value is not None else None
    return out


def upsert_period_financials(conn: sqlite3.Connection, result, doc_type: str, tsv_path: Path) -> bool:
    parsed = parse_tsv(str(tsv_path))
    if parsed is None:
        return False
    sec_code = (result.secCode or "").lstrip("0") or (result.secCode or "")
    conn.execute(
        """
        INSERT INTO period_financials (
          edinet_code, sec_code, doc_id, doc_type, period_start, period_end, submit_date_time, filer_name,
          summary_json, pl_json, bs_json, cf_json, raw_tsv_path
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(edinet_code, period_end, doc_type) DO UPDATE SET
          sec_code=excluded.sec_code,
          doc_id=excluded.doc_id,
          submit_date_time=excluded.submit_date_time,
          filer_name=excluded.filer_name,
          summary_json=excluded.summary_json,
          pl_json=excluded.pl_json,
          bs_json=excluded.bs_json,
          cf_json=excluded.cf_json,
          raw_tsv_path=excluded.raw_tsv_path,
          updated_at=CURRENT_TIMESTAMP
        """,
        (
            result.edinetCode,
            sec_code,
            result.docID,
            doc_type,
            result.periodStart,
            result.periodEnd,
            result.submitDateTime,
            result.filerName,
            json.dumps(to_flat_dict(parsed.summary), ensure_ascii=False),
            json.dumps(to_flat_dict(parsed.pl), ensure_ascii=False),
            json.dumps(to_flat_dict(parsed.bs), ensure_ascii=False),
            json.dumps(to_flat_dict(parsed.cf), ensure_ascii=False),
            tsv_path.as_posix(),
        ),
    )
    return True


def write_pipeline_run(
    conn: sqlite3.Connection,
    run_id: str,
    scope: str,
    target_date: str,
    status: str,
    fetched_documents: int = 0,
    ingested_documents: int = 0,
    skipped_documents: int = 0,
    error_count: int = 0,
    notes: str = "",
) -> None:
    conn.execute(
        """
        INSERT INTO pipeline_runs (
          run_id, scope, target_date, status, finished_at,
          fetched_documents, ingested_documents, skipped_documents, error_count, notes
        )
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?)
        ON CONFLICT(run_id) DO UPDATE SET
          status=excluded.status,
          finished_at=excluded.finished_at,
          fetched_documents=excluded.fetched_documents,
          ingested_documents=excluded.ingested_documents,
          skipped_documents=excluded.skipped_documents,
          error_count=excluded.error_count,
          notes=excluded.notes
        """,
        (run_id, scope, target_date, status, fetched_documents, ingested_documents, skipped_documents, error_count, notes),
    )


def write_daily_metrics(conn: sqlite3.Connection, snapshot_date: str) -> None:
    company_count = conn.execute("SELECT COUNT(*) FROM companies").fetchone()[0]
    document_count = conn.execute("SELECT COUNT(*) FROM documents").fetchone()[0]
    period_financial_count = conn.execute("SELECT COUNT(*) FROM period_financials").fetchone()[0]
    conn.execute(
        """
        INSERT INTO daily_metrics (snapshot_date, company_count, document_count, period_financial_count)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(snapshot_date) DO UPDATE SET
          company_count=excluded.company_count,
          document_count=excluded.document_count,
          period_financial_count=excluded.period_financial_count,
          generated_at=CURRENT_TIMESTAMP
        """,
        (snapshot_date, company_count, document_count, period_financial_count),
    )


def ensure_parent_dirs(paths: Iterable[Path]) -> None:
    for path in paths:
        path.parent.mkdir(parents=True, exist_ok=True)


def main() -> None:
    args = parse_args()
    target = resolve_target_date(args.target_date)
    doc_types = parse_doc_types(args.doc_types)

    args.db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(args.db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")

    apply_schema(conn, args.schema_path)

    run_id = f"{args.scope}-{target.isoformat()}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    conn.execute(
        """
        INSERT INTO pipeline_runs (run_id, scope, target_date, status)
        VALUES (?, ?, ?, 'running')
        """,
        (run_id, args.scope, target.isoformat()),
    )
    conn.commit()

    downloader = Downloader(request_delay_sec=args.request_delay)
    results = downloader.get_results(target.isoformat(), target.isoformat(), listed_only=args.listed_only)

    fetched_documents = 0
    ingested_documents = 0
    skipped_documents = 0
    error_count = 0

    for result in results:
        try:
            doc_type = downloader.get_doc_type_from_result(result)
            if doc_type not in doc_types:
                continue
            if result.withdrawalStatus == "1":
                skipped_documents += 1
                continue
            if not result.edinetCode:
                skipped_documents += 1
                continue

            fetched_documents += 1
            sec_code = (result.secCode or "").lstrip("0") or (result.secCode or "")
            upsert_company(conn, downloader, result.edinetCode, sec_code, result.filerName or "")
            upsert_document(conn, result, doc_type)

            year = target.strftime("%Y")
            month = target.strftime("%m")
            doc_dir = args.raw_root / doc_type / year / month / result.edinetCode
            doc_dir.mkdir(parents=True, exist_ok=True)

            tsv_path = doc_dir / f"{result.docID}.tsv"
            pdf_path = doc_dir / f"{result.docID}.pdf"
            json_path = doc_dir / f"{result.docID}.json"
            ensure_parent_dirs((tsv_path, pdf_path, json_path))

            downloader.download_document(result.docID, "tsv", str(doc_dir))
            if tsv_path.exists():
                upsert_raw_file_index(conn, result.docID, result.edinetCode, doc_type, "tsv", tsv_path)
            downloader.download_document(result.docID, "pdf", str(doc_dir))
            if pdf_path.exists():
                upsert_raw_file_index(conn, result.docID, result.edinetCode, doc_type, "pdf", pdf_path)
            json_path.write_text(json.dumps(result.to_dict(), ensure_ascii=False, indent=2), encoding="utf-8")
            upsert_raw_file_index(conn, result.docID, result.edinetCode, doc_type, "json", json_path)

            if tsv_path.exists() and upsert_period_financials(conn, result, doc_type, tsv_path):
                ingested_documents += 1
            else:
                skipped_documents += 1

            conn.commit()
        except Exception as exc:  # noqa: BLE001
            error_count += 1
            logger.exception("Failed to process doc_id={} error={}", getattr(result, "docID", "unknown"), exc)
            conn.rollback()

    status = "success" if error_count == 0 else "partial_success"
    notes = f"doc_types={sorted(doc_types)}"
    write_pipeline_run(
        conn,
        run_id=run_id,
        scope=args.scope,
        target_date=target.isoformat(),
        status=status,
        fetched_documents=fetched_documents,
        ingested_documents=ingested_documents,
        skipped_documents=skipped_documents,
        error_count=error_count,
        notes=notes,
    )
    write_daily_metrics(conn, target.isoformat())
    conn.commit()
    conn.close()

    logger.info(
        "Pipeline completed status={} fetched={} ingested={} skipped={} errors={}",
        status,
        fetched_documents,
        ingested_documents,
        skipped_documents,
        error_count,
    )


if __name__ == "__main__":
    main()
