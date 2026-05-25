#!/usr/bin/env python3
"""
前日比で件数急減を検知する品質チェック。
"""

from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Check daily metrics delta")
    parser.add_argument("--db_path", type=Path, default=Path("state/edinet_pipeline.db"))
    parser.add_argument("--max_drop_ratio", type=float, default=0.5, help="Fail when drop ratio exceeds threshold")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    conn = sqlite3.connect(args.db_path)
    rows = conn.execute(
        """
        SELECT snapshot_date, company_count, document_count, period_financial_count
        FROM daily_metrics
        ORDER BY snapshot_date DESC
        LIMIT 2
        """
    ).fetchall()
    conn.close()

    if len(rows) < 2:
        print("daily delta check skipped: not enough snapshots")
        return

    latest = rows[0]
    previous = rows[1]
    fields = ("company_count", "document_count", "period_financial_count")
    idx = {"company_count": 1, "document_count": 2, "period_financial_count": 3}

    for field in fields:
        cur = latest[idx[field]]
        prev = previous[idx[field]]
        if prev <= 0:
            continue
        ratio = 1 - (cur / prev)
        print(f"{field}: latest={cur} prev={prev} drop_ratio={ratio:.4f}")
        if ratio > args.max_drop_ratio:
            raise SystemExit(f"daily delta check failed: {field} dropped too much ({ratio:.2%})")

    print("daily delta check passed")


if __name__ == "__main__":
    main()
