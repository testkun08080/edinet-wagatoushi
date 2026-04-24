#!/usr/bin/env python3
"""
D1 互換 SQLite DB から、フロント互換の public/data JSON を生成する。
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import sqlite3
from pathlib import Path


def load_builder_functions():
    script_path = Path(__file__).resolve().parent.parent / "frontend" / "build_screener_data.py"
    spec = importlib.util.spec_from_file_location("build_screener_data_module", script_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Failed to load builder module: {script_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.summary_to_metrics_row, module.write_column_manifest, module.write_data_quality_reports


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build public/data JSON files from D1-compatible DB")
    parser.add_argument("--db_path", type=Path, default=Path("state/edinet_pipeline.db"))
    parser.add_argument("--output", type=Path, default=Path("../edinet-screener/public/data"))
    parser.add_argument("--strict", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    summary_to_metrics_row, write_column_manifest, write_data_quality_reports = load_builder_functions()
    conn = sqlite3.connect(args.db_path)
    conn.row_factory = sqlite3.Row

    rows = conn.execute(
        """
        SELECT
          pf.edinet_code,
          pf.sec_code,
          pf.filer_name,
          pf.doc_id,
          pf.doc_type,
          pf.period_start,
          pf.period_end,
          pf.submit_date_time,
          pf.summary_json,
          pf.pl_json,
          pf.bs_json,
          pf.cf_json,
          pf.raw_tsv_path
        FROM period_financials pf
        JOIN documents d ON d.doc_id = pf.doc_id
        WHERE d.withdrawal_status IS NULL OR d.withdrawal_status != '1'
        ORDER BY pf.sec_code, pf.period_end
        """
    ).fetchall()

    by_company: dict[str, dict] = {}
    for row in rows:
        sec_code = (row["sec_code"] or "").lstrip("0") or (row["sec_code"] or "")
        if not sec_code:
            continue
        item = by_company.setdefault(
            sec_code,
            {
                "edinetCode": row["edinet_code"],
                "secCode": sec_code,
                "filerName": row["filer_name"],
                "periods": [],
            },
        )
        item["periods"].append(
            {
                "periodStart": row["period_start"],
                "periodEnd": row["period_end"],
                "docID": row["doc_id"],
                "docDescription": row["doc_type"],
                "submitDateTime": row["submit_date_time"],
                "summary": json.loads(row["summary_json"]),
                "pl": json.loads(row["pl_json"]),
                "bs": json.loads(row["bs_json"]),
                "cf": json.loads(row["cf_json"]),
                "rawTsvPath": row["raw_tsv_path"],
            }
        )

    output_dir = args.output
    output_dir.mkdir(parents=True, exist_ok=True)
    summaries_dir = output_dir / "summaries"
    summaries_dir.mkdir(parents=True, exist_ok=True)

    companies = []
    metrics = []
    for sec_code, summary_data in sorted(by_company.items(), key=lambda x: x[0]):
        summary_data["periods"].sort(key=lambda x: x.get("periodEnd") or "")
        companies.append(
            {
                "edinetCode": summary_data["edinetCode"],
                "secCode": summary_data["secCode"],
                "filerName": summary_data["filerName"],
            }
        )
        (summaries_dir / f"{sec_code}.json").write_text(
            json.dumps(summary_data, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        metrics.append(summary_to_metrics_row(summary_data))

    (output_dir / "companies.json").write_text(
        json.dumps({"companies": companies}, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (output_dir / "company_metrics.json").write_text(
        json.dumps({"metrics": metrics}, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    column_config_path = Path(__file__).resolve().parent.parent.parent / "config" / "screener_columns.json"
    write_column_manifest(output_dir, config_path=column_config_path)
    write_data_quality_reports(output_dir, metrics, strict=args.strict)

    print(f"Generated from DB: companies={len(companies)} metrics={len(metrics)} output={output_dir}")


if __name__ == "__main__":
    main()
