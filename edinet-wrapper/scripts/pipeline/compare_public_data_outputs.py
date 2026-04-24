#!/usr/bin/env python3
"""
既存 data-set 由来 public/data と D1 由来 public/data の互換性を比較する。
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Compare two public/data directories")
    parser.add_argument("--baseline", type=Path, required=True, help="Existing (dataset-based) public/data path")
    parser.add_argument("--candidate", type=Path, required=True, help="D1-based public/data path")
    parser.add_argument("--max_missing_ratio", type=float, default=0.05)
    return parser.parse_args()


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    args = parse_args()
    baseline_metrics = load_json(args.baseline / "company_metrics.json").get("metrics", [])
    candidate_metrics = load_json(args.candidate / "company_metrics.json").get("metrics", [])
    baseline_companies = load_json(args.baseline / "companies.json").get("companies", [])
    candidate_companies = load_json(args.candidate / "companies.json").get("companies", [])

    base_sec = {str(x.get("secCode")) for x in baseline_companies if x.get("secCode")}
    cand_sec = {str(x.get("secCode")) for x in candidate_companies if x.get("secCode")}

    missing = sorted(base_sec - cand_sec)
    extra = sorted(cand_sec - base_sec)
    missing_ratio = (len(missing) / len(base_sec)) if base_sec else 0.0

    print(f"baseline_companies={len(base_sec)} candidate_companies={len(cand_sec)}")
    print(f"missing={len(missing)} extra={len(extra)} missing_ratio={missing_ratio:.4f}")
    print(f"baseline_metrics={len(baseline_metrics)} candidate_metrics={len(candidate_metrics)}")

    if missing_ratio > args.max_missing_ratio:
        raise SystemExit(
            f"compatibility check failed: missing_ratio {missing_ratio:.2%} > {args.max_missing_ratio:.2%}"
        )

    if missing:
        print("missing_sec_codes_sample:", ",".join(missing[:20]))
    if extra:
        print("extra_sec_codes_sample:", ",".join(extra[:20]))
    print("compatibility check passed")


if __name__ == "__main__":
    main()
