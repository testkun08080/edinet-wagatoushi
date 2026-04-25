#!/usr/bin/env python3
"""Export selected rows from a D1-compatible SQLite DB as D1 UPSERT SQL chunks."""

from __future__ import annotations

import argparse
import math
import sqlite3
from pathlib import Path
from typing import Iterable


DEFAULT_TABLES = (
    "companies",
    "documents",
    "period_financials",
    "raw_files_index",
    "pipeline_runs",
    "daily_metrics",
    "sec_code_latest_periods",
)

CONFLICT_COLUMNS = {
    "companies": ("edinet_code",),
    "documents": ("doc_id",),
    "period_financials": ("edinet_code", "period_end", "doc_type"),
    "raw_files_index": ("file_id",),
    "pipeline_runs": ("run_id",),
    "daily_metrics": ("snapshot_date",),
    "sec_code_latest_periods": ("sec_code",),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export SQLite rows as D1-compatible UPSERT SQL")
    parser.add_argument("--db_path", type=Path, default=Path("state/edinet_pipeline.db"))
    parser.add_argument("--output_dir", type=Path, default=Path("state/d1-sql"))
    parser.add_argument("--tables", type=str, default=",".join(DEFAULT_TABLES))
    parser.add_argument("--chunk_rows", type=int, default=100)
    parser.add_argument("--where_doc_ids_file", type=Path, default=None)
    return parser.parse_args()


def sql_quote(value) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "1" if value else "0"
    if isinstance(value, (bytes, bytearray)):
        return "X'" + bytes(value).hex() + "'"
    if isinstance(value, float):
        if not math.isfinite(value):
            return "NULL"
        return str(value)
    if isinstance(value, int):
        return str(value)
    text = str(value).replace("'", "''")
    return f"'{text}'"


def table_exists(conn: sqlite3.Connection, table: str) -> bool:
    row = conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,)).fetchone()
    return row is not None


def table_columns(conn: sqlite3.Connection, table: str) -> list[str]:
    if table not in CONFLICT_COLUMNS:
        raise ValueError(f"Unexpected table: {table}")
    # The table name is allow-listed above; PRAGMA cannot bind identifiers.
    return [row[1] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()]  # noqa: S608


def upsert_sql(table: str, columns: list[str], row: sqlite3.Row) -> str:
    if table not in CONFLICT_COLUMNS:
        raise ValueError(f"Unexpected table: {table}")
    conflict = CONFLICT_COLUMNS[table]
    quoted_columns = ", ".join(columns)
    values = ", ".join(sql_quote(row[col]) for col in columns)
    update_columns = [col for col in columns if col not in conflict]
    if update_columns:
        update_sql = ", ".join(f"{col}=excluded.{col}" for col in update_columns)
    else:
        update_sql = "rowid=rowid"
    conflict_sql = ", ".join(conflict)
    return (
        f"INSERT INTO {table} ({quoted_columns}) VALUES ({values}) "
        f"ON CONFLICT({conflict_sql}) DO UPDATE SET {update_sql};"
    )


def read_doc_ids(path: Path | None) -> set[str] | None:
    if path is None or not path.exists():
        return None
    return {line.strip() for line in path.read_text(encoding="utf-8").splitlines() if line.strip()}


def iter_rows(conn: sqlite3.Connection, table: str, doc_ids: set[str] | None) -> Iterable[sqlite3.Row]:
    if table not in CONFLICT_COLUMNS:
        raise ValueError(f"Unexpected table: {table}")
    if doc_ids is None or table not in {"documents", "period_financials", "raw_files_index"}:
        # The table name is allow-listed above; SELECT cannot bind identifiers.
        yield from conn.execute(f"SELECT * FROM {table}")  # noqa: S608
        return

    if not doc_ids:
        return

    placeholders = ",".join("?" for _ in doc_ids)
    if table == "documents":
        yield from conn.execute(f"SELECT * FROM documents WHERE doc_id IN ({placeholders})", tuple(doc_ids))
    elif table == "period_financials":
        yield from conn.execute(f"SELECT * FROM period_financials WHERE doc_id IN ({placeholders})", tuple(doc_ids))
    elif table == "raw_files_index":
        yield from conn.execute(f"SELECT * FROM raw_files_index WHERE doc_id IN ({placeholders})", tuple(doc_ids))


def write_chunk(path: Path, statements: list[str]) -> None:
    body = [*statements, ""]
    path.write_text("\n".join(body), encoding="utf-8")


def main() -> None:
    args = parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(args.db_path)
    conn.row_factory = sqlite3.Row
    doc_ids = read_doc_ids(args.where_doc_ids_file)

    manifest: list[str] = []
    tables = [t.strip() for t in args.tables.split(",") if t.strip()]
    for table in tables:
        if table not in CONFLICT_COLUMNS or not table_exists(conn, table):
            continue
        columns = table_columns(conn, table)
        statements: list[str] = []
        chunk_index = 1
        row_count = 0
        for row in iter_rows(conn, table, doc_ids):
            statements.append(upsert_sql(table, columns, row))
            row_count += 1
            if len(statements) >= args.chunk_rows:
                chunk_path = args.output_dir / f"{len(manifest) + 1:04d}_{table}_{chunk_index:04d}.sql"
                write_chunk(chunk_path, statements)
                manifest.append(chunk_path.name)
                statements = []
                chunk_index += 1
        if statements:
            chunk_path = args.output_dir / f"{len(manifest) + 1:04d}_{table}_{chunk_index:04d}.sql"
            write_chunk(chunk_path, statements)
            manifest.append(chunk_path.name)
        print(f"Exported table={table} rows={row_count}")

    (args.output_dir / "manifest.txt").write_text("\n".join(manifest) + ("\n" if manifest else ""), encoding="utf-8")
    conn.close()
    print(f"Wrote {len(manifest)} D1 SQL chunk(s) to {args.output_dir}")


if __name__ == "__main__":
    main()
