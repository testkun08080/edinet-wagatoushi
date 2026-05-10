#!/usr/bin/env python3
"""Convert repository data-set layout into import_corpus_to_db compatible layout.

Expected output layout:
  <import_root>/<edinet_code>/<doc_type>/<doc_id>.tsv
  <import_root>/<edinet_code>/<doc_type>/<doc_id>.json
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path


DOC_TYPES = ("annual", "quarterly", "semiannual", "large_holding")
DOC_TYPE_RE = re.compile(r"(annual|quarterly|semiannual|large_holding)")
EDINET_RE = re.compile(r"^E\d{5}$")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Convert data-set into import-root structure")
    parser.add_argument("--data_set_root", type=Path, required=True, help="Repository data-set root")
    parser.add_argument(
        "--output_root",
        type=Path,
        default=Path("state/import-root"),
        help="Output root for import_corpus_to_db.py",
    )
    parser.add_argument(
        "--link_mode",
        choices=("symlink", "hardlink", "copy"),
        default="symlink",
        help="How to materialize files in output_root",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Remove output_root before creating converted layout",
    )
    return parser.parse_args()


def infer_doc_type(path: Path) -> str | None:
    text = path.as_posix()
    match = DOC_TYPE_RE.search(text)
    if not match:
        return None
    doc_type = match.group(1)
    return doc_type if doc_type in DOC_TYPES else None


def infer_edinet_code(path: Path) -> str | None:
    for part in path.parts:
        if EDINET_RE.match(part):
            return part
    return None


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def materialize(src: Path, dest: Path, *, link_mode: str) -> None:
    if dest.exists():
        return
    ensure_parent(dest)
    if link_mode == "symlink":
        dest.symlink_to(src.resolve())
        return
    if link_mode == "hardlink":
        dest.hardlink_to(src)
        return
    dest.write_bytes(src.read_bytes())


def main() -> None:
    args = parse_args()
    data_set_root = args.data_set_root
    output_root = args.output_root
    if not data_set_root.exists():
        raise SystemExit(f"data_set_root not found: {data_set_root}")

    if args.reset and output_root.exists():
        for child in sorted(output_root.rglob("*"), reverse=True):
            if child.is_symlink() or child.is_file():
                child.unlink()
            elif child.is_dir():
                child.rmdir()
        output_root.rmdir()

    output_root.mkdir(parents=True, exist_ok=True)

    converted = 0
    skipped_no_json = 0
    skipped_unresolved = 0

    for tsv_path in data_set_root.rglob("*.tsv"):
        json_path = tsv_path.with_suffix(".json")
        if not json_path.exists():
            skipped_no_json += 1
            continue

        doc_type = infer_doc_type(tsv_path)
        edinet_code = infer_edinet_code(tsv_path)
        doc_id = tsv_path.stem
        if not doc_type or not edinet_code or not doc_id:
            skipped_unresolved += 1
            continue

        out_tsv = output_root / edinet_code / doc_type / f"{doc_id}.tsv"
        out_json = output_root / edinet_code / doc_type / f"{doc_id}.json"
        materialize(tsv_path, out_tsv, link_mode=args.link_mode)
        materialize(json_path, out_json, link_mode=args.link_mode)
        converted += 1

    # Reuse master CSV if available in dataset root.
    master_csv = data_set_root / "EdinetcodeDlInfo.csv"
    if master_csv.exists():
        out_master = output_root / "EdinetcodeDlInfo.csv"
        if not out_master.exists():
            materialize(master_csv, out_master, link_mode=args.link_mode)

    print(
        "Prepared import-root "
        f"converted={converted} skipped_no_json={skipped_no_json} "
        f"skipped_unresolved={skipped_unresolved} output={output_root}"
    )


if __name__ == "__main__":
    main()
