#!/usr/bin/env python3
"""
Merge two D1-compatible pipeline SQLite DBs into a destination.

Copy order: base first, then overlay (INSERT OR REPLACE), so overlay wins on
matching primary keys. Table copy order follows FK dependencies.
"""

from __future__ import annotations

import argparse
import sqlite3
import sys
from pathlib import Path

from db_common import apply_schema

# FK-safe order: companies → documents → children → independent → sec_code bridge
MERGE_TABLE_ORDER: tuple[str, ...] = (
    "companies",
    "documents",
    "period_financials",
    "raw_files_index",
    "pipeline_runs",
    "daily_metrics",
    "sec_code_latest_periods",
)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Merge two pipeline DBs (base then overlay; overlay wins on PK conflicts)")
    p.add_argument("--dst", type=Path, required=True, help="Destination SQLite DB path")
    p.add_argument("--base_db", type=Path, required=True, help="Base DB (e.g. remote D1 export); applied first")
    p.add_argument("--overlay_db", type=Path, required=True, help="Overlay DB (e.g. corpus pipeline); wins on conflicts")
    p.add_argument(
        "--schema_path",
        type=Path,
        default=Path(__file__).resolve().parents[2] / "sql" / "d1_schema.sql",
        help="Schema SQL used when --reset",
    )
    p.add_argument("--reset", action="store_true", help="Remove dst if present and recreate from schema_path")
    return p.parse_args()


def _user_tables(conn: sqlite3.Connection, schema: str = "main") -> list[str]:
    rows = conn.execute(
        """
        SELECT name FROM "%s".sqlite_master
        WHERE type = 'table' AND name NOT LIKE 'sqlite_%%'
        ORDER BY name
        """
        % schema
    ).fetchall()
    return [r[0] for r in rows]


def _table_exists(conn: sqlite3.Connection, schema: str, table: str) -> bool:
    row = conn.execute(
        'SELECT 1 FROM "%s".sqlite_master WHERE type = ? AND name = ?' % schema,
        ("table", table),
    ).fetchone()
    return row is not None


def _column_names(conn: sqlite3.Connection, schema: str, table: str) -> list[str]:
    rows = conn.execute(f'PRAGMA "{schema}".table_info("{table}")').fetchall()
    return [r[1] for r in rows]


def _ordered_tables(dst_tables: set[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for t in MERGE_TABLE_ORDER:
        if t in dst_tables:
            out.append(t)
            seen.add(t)
    rest = sorted(dst_tables - seen)
    out.extend(rest)
    return out


def _copy_table(
    conn: sqlite3.Connection,
    *,
    table: str,
    src_schema: str,
) -> int:
    if not _table_exists(conn, src_schema, table):
        return 0
    dest_cols = _column_names(conn, "main", table)
    if not dest_cols:
        return 0
    src_cols = set(_column_names(conn, src_schema, table))
    select_exprs: list[str] = []
    for c in dest_cols:
        if c in src_cols:
            select_exprs.append(f'"{src_schema}"."{table}"."{c}"')
        else:
            select_exprs.append("NULL")
    cols_sql = ", ".join(f'"{c}"' for c in dest_cols)
    select_sql = ", ".join(select_exprs)
    sql = (
        f'INSERT OR REPLACE INTO main."{table}" ({cols_sql}) '
        f'SELECT {select_sql} FROM "{src_schema}"."{table}"'
    )
    cur = conn.execute(sql)
    return cur.rowcount if cur.rowcount is not None else 0


def main() -> int:
    args = parse_args()
    dst = args.dst.resolve()
    base_db = args.base_db.resolve()
    overlay_db = args.overlay_db.resolve()
    schema_path = args.schema_path.resolve()

    if not base_db.is_file():
        print(f"error: base_db not found: {base_db}", file=sys.stderr)
        return 1
    if not overlay_db.is_file():
        print(f"error: overlay_db not found: {overlay_db}", file=sys.stderr)
        return 1
    if args.reset and not schema_path.is_file():
        print(f"error: schema_path not found: {schema_path}", file=sys.stderr)
        return 1

    if args.reset and dst.exists():
        dst.unlink()

    if args.reset:
        dst.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(dst))
        try:
            apply_schema(conn, schema_path)
            conn.commit()
        finally:
            conn.close()
    elif not dst.is_file():
        print(f"error: destination does not exist (use --reset): {dst}", file=sys.stderr)
        return 1

    conn = sqlite3.connect(str(dst))
    try:
        conn.execute("PRAGMA foreign_keys = OFF")
        conn.execute(f'ATTACH DATABASE "{base_db}" AS base_db')
        conn.execute(f'ATTACH DATABASE "{overlay_db}" AS overlay_db')

        dst_tables = set(_user_tables(conn, "main"))
        tables = _ordered_tables(dst_tables)
        total_base = 0
        total_overlay = 0
        for table in tables:
            n = _copy_table(conn, table=table, src_schema="base_db")
            total_base += n
            n = _copy_table(conn, table=table, src_schema="overlay_db")
            total_overlay += n

        conn.commit()
        print(
            f"Merged into {dst} (tables={len(tables)}); "
            f"rows touched base≈{total_base} overlay≈{total_overlay} (rowcount may be -1 for some SQLite builds)"
        )
    finally:
        conn.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
