"""Back-fill N years of EDINET submissions into local SQLite.

Useful for fork users seeding their own D1 from scratch.
"""

from __future__ import annotations

import argparse
from datetime import date, timedelta
from pathlib import Path

from edinet_wrapper.db import apply_schema, open_db


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--years", type=int, default=1)
    parser.add_argument("--output", type=Path, default=Path("data/edinet.db"))
    parser.add_argument("--from-date", default=None)
    parser.add_argument("--to-date", default=None)
    args = parser.parse_args()

    conn = open_db(args.output)
    apply_schema(conn)

    to_d = date.fromisoformat(args.to_date) if args.to_date else date.today()
    from_d = (
        date.fromisoformat(args.from_date)
        if args.from_date
        else to_d - timedelta(days=365 * args.years)
    )

    print(f"[backfill] {from_d} → {to_d} into {args.output}")
    print("[backfill] TODO: wire up edinet_wrapper.downloader.iterate_dates()")
    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
