"""Daily EDINET ingestion (v2 simplified).

Replaces the bidirectional D1↔SQLite sync of scripts/pipeline/ingest_daily_*.
The local SQLite is treated as ephemeral; we only need it to stage what
will be UPSERTed into D1 in publish_to_d1.py.

Usage:
    uv run python scripts/ingest_daily.py \
        --date 2026-05-25 \
        --output data/edinet.db \
        --known-docs /tmp/known_docs.json   # optional, skips re-download
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from edinet_wrapper.db import apply_schema, open_db


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", required=True, help="Submission date (YYYY-MM-DD)")
    parser.add_argument("--output", type=Path, default=Path("data/edinet.db"))
    parser.add_argument("--known-docs", type=Path, default=None)
    parser.add_argument("--api-key", default=None, help="Falls back to EDINET_API_KEY env var")
    args = parser.parse_args()

    known: set[str] = set()
    if args.known_docs and args.known_docs.exists():
        known = set(json.loads(args.known_docs.read_text()))

    conn = open_db(args.output)
    apply_schema(conn)

    # The real implementation wires edinet_wrapper.downloader + parser here.
    # That is intentionally left as TODO to keep this scaffold short — the
    # existing pipeline scripts cover the logic and will be folded in once
    # the new SQLite-first flow is exercised end-to-end.
    print(f"[ingest] would fetch EDINET docs for {args.date}, skipping {len(known)} known")
    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
