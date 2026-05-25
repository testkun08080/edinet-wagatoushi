"""Emit a delta SQL file from local SQLite and (optionally) apply it to D1.

Replaces scripts/pipeline/sqlite_export_d1.py + sqlite_diff_d1.py. The two
ran D1 export → diff → re-import in a round trip; this version computes
the delta directly from the locally-ingested SQLite using the updated_at
column maintained by db.upsert_*.

Usage:
    uv run python scripts/publish_to_d1.py \
        --source data/edinet.db \
        --since 2026-05-24T00:00:00 \
        --output /tmp/delta.sql

Apply to D1 separately so this script needs no Cloudflare credentials:
    wrangler d1 execute edinet-production --remote --file /tmp/delta.sql
"""
from __future__ import annotations

import argparse
from pathlib import Path

from edinet_wrapper.db import export_inserts_after, open_db


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True, help="Local SQLite path")
    parser.add_argument(
        "--since",
        required=True,
        help="ISO timestamp; emit rows with updated_at >= since",
    )
    parser.add_argument("--output", type=Path, default=Path("/tmp/delta.sql"))
    args = parser.parse_args()

    conn = open_db(args.source)
    stmts = list(export_inserts_after(conn, args.since))
    conn.close()

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text("\n".join(stmts) + "\n", encoding="utf-8")
    print(f"[publish] wrote {len(stmts)} statements to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
