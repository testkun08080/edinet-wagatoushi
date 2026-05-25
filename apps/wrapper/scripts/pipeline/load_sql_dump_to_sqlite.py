#!/usr/bin/env python3
"""Load a D1 SQL export into a local SQLite DB for JSON generation and validation."""

from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path

from db_common import apply_schema


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Load a D1 SQL export into a local SQLite database")
    parser.add_argument("--sql_path", type=Path, required=True)
    parser.add_argument("--db_path", type=Path, default=Path("state/edinet_pipeline.db"))
    parser.add_argument("--schema_path", type=Path, default=Path("sql/d1_schema.sql"))
    parser.add_argument("--reset", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.reset and args.db_path.exists():
        args.db_path.unlink()
    args.db_path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(args.db_path)
    conn.execute("PRAGMA foreign_keys=OFF")
    apply_schema(conn, args.schema_path)
    sql = args.sql_path.read_text(encoding="utf-8")
    if sql.strip():
        conn.executescript(sql)
    conn.commit()
    conn.execute("PRAGMA foreign_keys=ON")
    conn.close()
    print(f"Loaded SQL dump into SQLite DB: {args.db_path}")


if __name__ == "__main__":
    main()
