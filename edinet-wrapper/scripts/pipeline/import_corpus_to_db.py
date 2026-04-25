#!/usr/bin/env python3
"""Import an existing EDINET corpus directory into the D1-compatible SQLite DB."""

from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from db_common import (
    DOC_TYPES_DEFAULT,
    apply_schema,
    insert_company,
    insert_document,
    insert_period_financials,
    insert_raw_file_index,
    load_edinet_master,
    normalize_sec_code,
    parse_tsv_sections,
    public_raw_tsv_path,
    write_daily_metrics,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import edinet-wrapper/data corpus into D1-compatible SQLite DB")
    parser.add_argument("--data_root", type=Path, default=Path("data"), help="Corpus root, e.g. edinet-wrapper/data")
    parser.add_argument("--db_path", type=Path, default=Path("state/edinet_pipeline.db"))
    parser.add_argument("--schema_path", type=Path, default=Path("sql/d1_schema.sql"))
    parser.add_argument("--doc_types", type=str, default=",".join(DOC_TYPES_DEFAULT))
    parser.add_argument("--reset", action="store_true", help="Delete existing DB before importing")
    parser.add_argument("--scope", type=str, default="corpus-seed")
    return parser.parse_args()


def selected_doc_types(raw: str) -> set[str]:
    values = {v.strip() for v in raw.split(",") if v.strip()}
    return values or set(DOC_TYPES_DEFAULT)


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def iter_corpus_pairs(data_root: Path, doc_types: set[str]) -> list[tuple[str, Path, Path]]:
    pairs: list[tuple[str, Path, Path]] = []
    for tsv_path in data_root.glob("E*/**/*.tsv"):
        doc_type = tsv_path.parent.name
        if doc_type not in doc_types:
            continue
        json_path = tsv_path.with_suffix(".json")
        if json_path.exists():
            pairs.append((doc_type, tsv_path, json_path))

    def sort_key(item: tuple[str, Path, Path]) -> tuple[str, str, str]:
        _, _, json_path = item
        try:
            meta = json.loads(json_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return ("", "", json_path.as_posix())
        return (meta.get("edinetCode") or "", meta.get("periodEnd") or "", meta.get("docID") or json_path.stem)

    return sorted(pairs, key=sort_key)


def main() -> None:
    args = parse_args()
    if args.reset and args.db_path.exists():
        args.db_path.unlink()

    args.db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(args.db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    apply_schema(conn, args.schema_path)

    master = load_edinet_master(args.data_root)
    doc_types = selected_doc_types(args.doc_types)
    pairs = iter_corpus_pairs(args.data_root, doc_types)

    imported = 0
    skipped = 0
    for doc_type, tsv_path, json_path in pairs:
        meta = json.loads(json_path.read_text(encoding="utf-8"))
        edinet_code = meta.get("edinetCode") or tsv_path.parts[-3]
        doc_id = meta.get("docID") or tsv_path.stem
        meta["edinetCode"] = edinet_code
        meta["docID"] = doc_id
        meta["secCode"] = normalize_sec_code(meta.get("secCode"))

        parsed = parse_tsv_sections(tsv_path)
        if parsed is None:
            skipped += 1
            continue
        summary, pl, bs, cf = parsed

        master_row = master.get(edinet_code, {})
        sec_code = normalize_sec_code(meta.get("secCode") or master_row.get("sec_code"))
        filer_name = meta.get("filerName") or master_row.get("filer_name") or ""
        meta["secCode"] = sec_code
        meta["filerName"] = filer_name

        insert_company(
            conn,
            edinet_code=edinet_code,
            sec_code=sec_code,
            filer_name=filer_name,
            listed_category=master_row.get("listed_category"),
            industry=master_row.get("industry"),
        )
        insert_document(conn, meta=meta, doc_type=doc_type)
        raw_path = public_raw_tsv_path(sec_code, doc_id)
        insert_period_financials(
            conn,
            meta=meta,
            doc_type=doc_type,
            summary=summary,
            pl=pl,
            bs=bs,
            cf=cf,
            raw_tsv_path=raw_path,
        )
        insert_raw_file_index(
            conn,
            doc_id=doc_id,
            edinet_code=edinet_code,
            doc_type=doc_type,
            file_type="tsv",
            object_key=tsv_path.as_posix(),
            file_hash=file_sha256(tsv_path),
            file_size_bytes=tsv_path.stat().st_size,
        )
        insert_raw_file_index(
            conn,
            doc_id=doc_id,
            edinet_code=edinet_code,
            doc_type=doc_type,
            file_type="json",
            object_key=json_path.as_posix(),
            file_hash=file_sha256(json_path),
            file_size_bytes=json_path.stat().st_size,
        )
        imported += 1
        if imported % 100 == 0:
            conn.commit()

    now = datetime.now(UTC)
    snapshot_date = now.strftime("%Y-%m-%d")
    run_id = f"{args.scope}-{snapshot_date}-{now.strftime('%Y%m%d%H%M%S')}"
    conn.execute(
        """
        INSERT INTO pipeline_runs (
          run_id, scope, target_date, status, finished_at,
          fetched_documents, ingested_documents, skipped_documents, error_count, notes
        )
        VALUES (?, ?, ?, 'success', CURRENT_TIMESTAMP, ?, ?, ?, 0, ?)
        """,
        (run_id, args.scope, snapshot_date, imported, imported, skipped, f"data_root={args.data_root}"),
    )
    write_daily_metrics(conn, snapshot_date)
    conn.commit()
    conn.close()
    print(f"Imported corpus into DB: imported={imported} skipped={skipped} db={args.db_path}")


if __name__ == "__main__":
    main()
