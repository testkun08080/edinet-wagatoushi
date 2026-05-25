#!/usr/bin/env python3
"""Production quality gates for generated edinet-screener public/data JSON."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from db_common import normalize_sec_code


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate public/data JSON consistency and production coverage")
    parser.add_argument("--public_data", type=Path, default=Path("../edinet-screener/public/data"))
    parser.add_argument("--previous_metrics", type=Path, default=None)
    parser.add_argument("--max_drop_ratio", type=float, default=0.1)
    parser.add_argument(
        "--required_sec_codes",
        type=str,
        default="",
        help="Comma-separated secCodes that must appear in generated data (optional; empty skips this check)",
    )
    parser.add_argument("--min_companies", type=int, default=1)
    return parser.parse_args()


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def sec_set(rows: list[dict]) -> set[str]:
    return {normalize_sec_code(str(row.get("secCode") or "")) for row in rows if row.get("secCode")}


def main() -> None:
    args = parse_args()
    companies_path = args.public_data / "companies.json"
    metrics_path = args.public_data / "company_metrics.json"
    summaries_dir = args.public_data / "summaries"

    companies = load_json(companies_path).get("companies", [])
    metrics = load_json(metrics_path).get("metrics", [])
    company_sec = sec_set(companies)
    metric_sec = sec_set(metrics)
    summary_sec = {normalize_sec_code(path.stem) for path in summaries_dir.glob("*.json")}

    if len(companies) < args.min_companies:
        raise SystemExit(f"companies count too small: {len(companies)} < {args.min_companies}")
    if len(metrics) < args.min_companies:
        raise SystemExit(f"metrics count too small: {len(metrics)} < {args.min_companies}")
    if company_sec != metric_sec:
        missing_metrics = sorted(company_sec - metric_sec)
        missing_companies = sorted(metric_sec - company_sec)
        raise SystemExit(
            "companies/metrics secCode mismatch: "
            f"missing_metrics={missing_metrics[:20]} missing_companies={missing_companies[:20]}"
        )
    missing_summaries = sorted(company_sec - summary_sec)
    if missing_summaries:
        raise SystemExit(f"summaries missing for secCodes: {missing_summaries[:20]}")

    required = {normalize_sec_code(code) for code in args.required_sec_codes.split(",") if code.strip()}
    if required:
        missing_required = sorted(required - company_sec)
        if missing_required:
            raise SystemExit(f"required secCodes missing from generated data: {missing_required}")

    if args.previous_metrics and args.previous_metrics.exists():
        previous = load_json(args.previous_metrics).get("metrics", [])
        prev_count = len(previous)
        if prev_count > 0:
            drop_ratio = 1 - (len(metrics) / prev_count)
            print(f"metrics count: current={len(metrics)} previous={prev_count} drop_ratio={drop_ratio:.4f}")
            if drop_ratio > args.max_drop_ratio:
                raise SystemExit(f"metrics dropped too much: {drop_ratio:.2%} > {args.max_drop_ratio:.2%}")

    print(
        "public data validation passed: "
        f"companies={len(companies)} metrics={len(metrics)} summaries={len(summary_sec)}"
    )


if __name__ == "__main__":
    main()
