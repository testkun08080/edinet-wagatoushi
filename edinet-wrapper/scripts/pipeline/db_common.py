#!/usr/bin/env python3
"""Shared helpers for D1-compatible EDINET pipeline scripts."""

from __future__ import annotations

import csv
import importlib.util
import json
import sqlite3
from pathlib import Path
from typing import Any

from edinet_wrapper import parse_tsv


DOC_TYPES_DEFAULT = ("annual", "quarterly", "semiannual", "large_holding")
PUBLIC_RAW_TSV_PREFIX = "raw_tsv/"
_BUILDER_MODULE: Any | None = None


def normalize_sec_code(sec_code: str | None) -> str:
    value = (sec_code or "").strip().strip('"')
    value = value.lstrip("0") or value
    if len(value) == 5 and value.endswith("0"):
        value = value[:-1]
    return value


def apply_schema(conn: sqlite3.Connection, schema_path: Path) -> None:
    conn.executescript(schema_path.read_text(encoding="utf-8"))


def load_builder_module() -> Any:
    global _BUILDER_MODULE
    if _BUILDER_MODULE is not None:
        return _BUILDER_MODULE
    script_path = Path(__file__).resolve().parent.parent / "frontend" / "build_screener_data.py"
    spec = importlib.util.spec_from_file_location("build_screener_data_module", script_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Failed to load builder module: {script_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    _BUILDER_MODULE = module
    return _BUILDER_MODULE


def flatten_parsed_section(section: dict) -> dict:
    module = load_builder_module()
    if not isinstance(section, dict):
        return {}
    return module._flatten_for_period(section)  # noqa: SLF001 - pipeline reuse of frontend-compatible flattener


def parse_tsv_sections(tsv_path: Path) -> tuple[dict, dict, dict, dict] | None:
    parsed = parse_tsv(str(tsv_path))
    if parsed is None:
        return None
    return (
        flatten_parsed_section(parsed.summary),
        flatten_parsed_section(parsed.pl),
        flatten_parsed_section(parsed.bs),
        flatten_parsed_section(parsed.cf),
    )


def load_edinet_master(data_root: Path) -> dict[str, dict[str, str | None]]:
    csv_path = data_root / "EdinetcodeDlInfo.csv"
    if not csv_path.exists():
        return {}

    # Prefer shift_jis to keep compatibility with existing workflow, and
    # transparently fallback to cp932 when vendor-specific bytes are included.
    decode_error: UnicodeDecodeError | None = None
    for encoding in ("shift_jis", "cp932"):
        try:
            with csv_path.open(encoding=encoding, errors="strict") as f:
                reader = csv.reader(f)
                next(reader, None)
                header = next(reader, None)
                if not header:
                    return {}

                def idx(name: str) -> int | None:
                    try:
                        return header.index(name)
                    except ValueError:
                        return None

                idx_edinet = idx("ＥＤＩＮＥＴコード")
                idx_sec = idx("証券コード")
                idx_name = idx("提出者名")
                idx_listed = idx("上場区分")
                idx_industry = idx("提出者業種")
                if idx_edinet is None:
                    return {}

                master: dict[str, dict[str, str | None]] = {}
                for row in reader:
                    if len(row) <= idx_edinet:
                        continue
                    edinet_code = (row[idx_edinet] or "").strip().strip('"')
                    if not edinet_code:
                        continue
                    master[edinet_code] = {
                        "sec_code": normalize_sec_code(row[idx_sec]) if idx_sec is not None and len(row) > idx_sec else "",
                        "filer_name": (row[idx_name] or "").strip().strip('"') if idx_name is not None and len(row) > idx_name else "",
                        "listed_category": (row[idx_listed] or "").strip().strip('"') if idx_listed is not None and len(row) > idx_listed else None,
                        "industry": (row[idx_industry] or "").strip().strip('"') if idx_industry is not None and len(row) > idx_industry else None,
                    }
                return master
        except UnicodeDecodeError as exc:
            decode_error = exc
            continue

    if decode_error is not None:
        raise decode_error
    return {}


def public_raw_tsv_path(sec_code: str, doc_id: str) -> str:
    safe_doc_id = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in (doc_id or "unknown"))
    return f"{PUBLIC_RAW_TSV_PREFIX}{normalize_sec_code(sec_code)}/{safe_doc_id}.json"


def normalize_public_raw_tsv_path(path: str | None) -> str | None:
    if not path:
        return None
    return path if path.startswith(PUBLIC_RAW_TSV_PREFIX) else None


def insert_company(
    conn: sqlite3.Connection,
    *,
    edinet_code: str,
    sec_code: str,
    filer_name: str,
    listed_category: str | None = None,
    industry: str | None = None,
) -> None:
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
        (edinet_code, normalize_sec_code(sec_code), filer_name, listed_category, industry),
    )


def insert_document(conn: sqlite3.Connection, *, meta: dict, doc_type: str, source_meta_json: str | None = None) -> None:
    sec_code = normalize_sec_code(meta.get("secCode"))
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
            meta.get("docID") or "",
            meta.get("edinetCode") or "",
            sec_code,
            doc_type,
            meta.get("ordinanceCode") or "",
            meta.get("formCode") or "",
            meta.get("docTypeCode") or "",
            meta.get("periodStart") or "",
            meta.get("periodEnd") or "",
            meta.get("submitDateTime") or "",
            meta.get("withdrawalStatus") or "",
            meta.get("docDescription") or "",
            source_meta_json if source_meta_json is not None else json.dumps(meta, ensure_ascii=False),
        ),
    )


def insert_raw_file_index(
    conn: sqlite3.Connection,
    *,
    doc_id: str,
    edinet_code: str,
    doc_type: str,
    file_type: str,
    object_key: str,
    file_hash: str | None = None,
    file_size_bytes: int | None = None,
) -> None:
    conn.execute(
        """
        INSERT INTO raw_files_index (file_id, doc_id, edinet_code, doc_type, file_type, object_key, file_hash, file_size_bytes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(file_id) DO UPDATE SET
          object_key=excluded.object_key,
          file_hash=excluded.file_hash,
          file_size_bytes=excluded.file_size_bytes
        """,
        (f"{doc_id}:{file_type}", doc_id, edinet_code, doc_type, file_type, object_key, file_hash, file_size_bytes),
    )


def insert_period_financials(
    conn: sqlite3.Connection,
    *,
    meta: dict,
    doc_type: str,
    summary: dict,
    pl: dict,
    bs: dict,
    cf: dict,
    raw_tsv_path: str | None,
) -> None:
    sec_code = normalize_sec_code(meta.get("secCode"))
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
            meta.get("edinetCode") or "",
            sec_code,
            meta.get("docID") or "",
            doc_type,
            meta.get("periodStart") or "",
            meta.get("periodEnd") or "",
            meta.get("submitDateTime") or "",
            meta.get("filerName") or "",
            json.dumps(summary, ensure_ascii=False),
            json.dumps(pl, ensure_ascii=False),
            json.dumps(bs, ensure_ascii=False),
            json.dumps(cf, ensure_ascii=False),
            raw_tsv_path,
        ),
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
