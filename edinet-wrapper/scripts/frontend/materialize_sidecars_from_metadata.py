#!/usr/bin/env python3
"""
download_company_10years.py が保存した metadata.json だけしかない data/{EDINET}/ を、
build_screener_data.py が期待する「各 TSV と同名の {docID}.json」形式に揃える。

metadata の各書類に filerName / secCode が無いため、--sec-code / --filer-name で渡す
（または E02367 の場合は任天堂のデフォルトを使う）。
"""

from __future__ import annotations

import json
from argparse import ArgumentParser
from pathlib import Path

# build_screener_data.process_company が読むフィールドに合わせる（API Result の一部で足りる）
DEFAULT_COMPANY_META = {
    "E02367": {"secCode": "7974", "filerName": "任天堂株式会社"},
}


def _result_like_sidecar(
    doc: dict,
    *,
    edinet_code: str,
    sec_code: str,
    filer_name: str,
) -> dict:
    doc_id = doc["docID"]
    return {
        "seqNumber": 0,
        "docID": doc_id,
        "edinetCode": edinet_code,
        "secCode": sec_code,
        "JCN": "",
        "filerName": filer_name,
        "fundCode": "",
        "ordinanceCode": "",
        "formCode": "",
        "docTypeCode": "",
        "periodStart": doc.get("periodStart") or "",
        "periodEnd": doc.get("periodEnd") or "",
        "submitDateTime": doc.get("submitDateTime") or "",
        "docDescription": doc.get("docDescription") or "",
        "issuerEdinetCode": "",
        "subjectEdinetCode": "",
        "subsidiaryEdinetCode": "",
        "currentReportReason": "",
        "parentDocID": "",
        "opeDateTime": "",
        "withdrawalStatus": "",
        "docInfoEditStatus": "",
        "disclosureStatus": "",
        "xbrlFlag": "",
        "pdfFlag": "",
        "attachDocFlag": "",
        "englishDocFlag": "",
        "csvFlag": "",
        "legalStatus": "",
    }


def main() -> None:
    parser = ArgumentParser(description="metadata.json から {docID}.json サイドカーを生成する")
    parser.add_argument(
        "company_dir",
        type=Path,
        help="企業ディレクトリ（例: data/E02367）",
    )
    parser.add_argument("--sec-code", type=str, default=None, help="証券コード（EDINETの表記）")
    parser.add_argument("--filer-name", type=str, default=None, help="提出者名")
    parser.add_argument(
        "--force",
        action="store_true",
        help="既存の {docID}.json があっても上書きする",
    )
    args = parser.parse_args()

    company_dir = args.company_dir.resolve()
    meta_path = company_dir / "metadata.json"
    if not meta_path.is_file():
        raise SystemExit(f"metadata.json がありません: {meta_path}")

    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    edinet_code = meta.get("edinet_code") or ""
    if not edinet_code:
        raise SystemExit("metadata.json に edinet_code がありません")

    sec_code = args.sec_code
    filer_name = args.filer_name
    if sec_code is None or filer_name is None:
        defaults = DEFAULT_COMPANY_META.get(edinet_code)
        if defaults:
            sec_code = sec_code or defaults["secCode"]
            filer_name = filer_name or defaults["filerName"]
        else:
            raise SystemExit(
                f"{edinet_code} のデフォルトがありません。--sec-code と --filer-name を指定してください。"
            )

    written = 0
    skipped = 0
    for doc in meta.get("documents") or []:
        doc_id = doc.get("docID")
        doc_type = doc.get("doc_type")
        if not doc_id or not doc_type:
            continue
        tsv_path = company_dir / doc_type / f"{doc_id}.tsv"
        json_path = company_dir / doc_type / f"{doc_id}.json"
        if not tsv_path.is_file():
            continue
        if json_path.is_file() and not args.force:
            skipped += 1
            continue
        payload = _result_like_sidecar(
            doc,
            edinet_code=edinet_code,
            sec_code=sec_code,
            filer_name=filer_name,
        )
        json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        written += 1

    print(f"edinet={edinet_code}  wrote={written}  skipped_existing={skipped}  dir={company_dir}")


if __name__ == "__main__":
    main()
