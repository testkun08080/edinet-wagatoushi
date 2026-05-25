#!/usr/bin/env python3
"""
重い集計を事前計算して D1 読み取り負荷を下げるためのマテリアライズ処理。
"""

from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Materialize daily aggregate table for D1-ready workload")
    parser.add_argument("--db_path", type=Path, default=Path("state/edinet_pipeline.db"))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    conn = sqlite3.connect(args.db_path)

    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS sec_code_latest_periods (
          sec_code TEXT PRIMARY KEY,
          edinet_code TEXT NOT NULL,
          filer_name TEXT NOT NULL,
          latest_doc_id TEXT NOT NULL,
          latest_period_end TEXT NOT NULL,
          latest_submit_date_time TEXT,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        INSERT INTO sec_code_latest_periods (
          sec_code, edinet_code, filer_name, latest_doc_id, latest_period_end, latest_submit_date_time
        )
        SELECT
          pf.sec_code,
          pf.edinet_code,
          pf.filer_name,
          pf.doc_id,
          MAX(pf.period_end) AS latest_period_end,
          MAX(pf.submit_date_time) AS latest_submit_date_time
        FROM period_financials pf
        WHERE pf.sec_code IS NOT NULL AND pf.sec_code != ''
        GROUP BY pf.sec_code
        ON CONFLICT(sec_code) DO UPDATE SET
          edinet_code=excluded.edinet_code,
          filer_name=excluded.filer_name,
          latest_doc_id=excluded.latest_doc_id,
          latest_period_end=excluded.latest_period_end,
          latest_submit_date_time=excluded.latest_submit_date_time,
          updated_at=CURRENT_TIMESTAMP;
        """
    )
    conn.commit()
    conn.close()
    print("Materialized sec_code_latest_periods")


if __name__ == "__main__":
    main()
