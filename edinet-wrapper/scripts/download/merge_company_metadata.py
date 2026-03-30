#!/usr/bin/env python3
"""Merge metadata_YYYY.json (per CI matrix year) into metadata.json per company."""

from __future__ import annotations

import json
import sys
from pathlib import Path


def merge_dir(output_dir: Path) -> None:
    for company_dir in sorted(output_dir.iterdir()):
        if not company_dir.is_dir():
            continue
        metas = sorted(company_dir.glob("metadata_*.json"))
        if not metas:
            continue

        merged: dict | None = None
        all_docs: list[dict] = []
        seen: set[str] = set()

        for mp in metas:
            with open(mp, encoding="utf-8") as f:
                data = json.load(f)
            if merged is None:
                merged = {
                    "edinet_code": data.get("edinet_code"),
                    "download_date_merged": None,
                    "date_range_merged_from_parts": True,
                    "doc_types": data.get("doc_types"),
                    "file_type": data.get("file_type"),
                    "skip_existing": data.get("skip_existing"),
                    "total_documents": 0,
                    "downloaded_count": 0,
                    "skipped_count": 0,
                    "documents": [],
                }
            for d in data.get("documents", []):
                did = d.get("docID")
                if isinstance(did, str) and did and did not in seen:
                    seen.add(did)
                    all_docs.append(d)

        if merged is None:
            continue

        merged["documents"] = all_docs
        merged["total_documents"] = len(all_docs)
        merged["downloaded_count"] = sum(1 for d in all_docs if not d.get("skipped"))
        merged["skipped_count"] = sum(1 for d in all_docs if d.get("skipped"))

        out = company_dir / "metadata.json"
        with open(out, "w", encoding="utf-8") as f:
            json.dump(merged, f, ensure_ascii=False, indent=2)


def main() -> None:
    if len(sys.argv) != 2:
        print("usage: merge_company_metadata.py <output_dir>", file=sys.stderr)
        sys.exit(1)
    merge_dir(Path(sys.argv[1]))


if __name__ == "__main__":
    main()
