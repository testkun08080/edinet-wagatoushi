#!/usr/bin/env python3
"""
指定された企業の10年間分の有価証券報告書をダウンロードするスクリプト
"""

import os
import sys
import json
import datetime
from pathlib import Path
from argparse import ArgumentParser
from loguru import logger

# .env を読み込む（edinet-wrapper/.env）
try:
    from dotenv import load_dotenv

    project_root = Path(__file__).resolve().parent.parent.parent
    load_dotenv(project_root / ".env")
except ImportError:
    pass

from edinet_wrapper import Downloader

# --doc_types 未指定時は EDINET で取得対象になり得る書類種別をすべて含める
DEFAULT_DOC_TYPES: list[str] = [
    "annual",
    "quarterly",
    "semiannual",
    "large_holding",
    "annual_amended",
    "quarterly_amended",
    "semiannual_amended",
    "large_holding_amended",
]


def parse_args():
    parser = ArgumentParser(
        "Download documents for one or multiple EDINET codes for the last N years"
    )
    parser.add_argument(
        "--edinet_code",
        type=str,
        default=None,
        help="Single EDINET code (e.g., E02144)",
    )
    parser.add_argument(
        "--edinet_codes",
        type=str,
        nargs="+",
        default=None,
        help="Multiple EDINET codes (space separated)",
    )
    parser.add_argument(
        "--companies_json",
        type=str,
        default=None,
        help="Path to company list JSON that contains edinetCode fields",
    )
    parser.add_argument(
        "--output_dir",
        type=str,
        default="data",
        help="Output directory",
    )
    parser.add_argument(
        "--file_type",
        type=str,
        default="tsv",
        choices=["pdf", "tsv", "xbrl"],
        help="File type to download",
    )
    parser.add_argument(
        "--years",
        type=int,
        default=10,
        help="Number of years to download (default: 10). Ignored when --year is set.",
    )
    parser.add_argument(
        "--year",
        type=int,
        default=None,
        metavar="YYYY",
        help="Single calendar year (e.g. 2024). Downloads Jan 1–Dec 31 (clipped to today). "
        "Use for CI matrix splits; overrides --years for the date window.",
    )
    parser.add_argument(
        "--doc_types",
        type=str,
        nargs="+",
        default=None,
        choices=[
            "annual",
            "quarterly",
            "semiannual",
            "large_holding",
            "annual_amended",
            "quarterly_amended",
            "semiannual_amended",
            "large_holding_amended",
        ],
        help="Document types to download (multiple allowed; default: all types)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-download even when the output file already exists",
    )
    args = parser.parse_args()
    if args.doc_types is None:
        args.doc_types = list(DEFAULT_DOC_TYPES)
    return args


def _artifact_exists(target_dir: Path, doc_id: str, file_type: str) -> bool:
    """TSV/PDF は非空ファイル、XBRL は doc_id 配下にファイルがあれば取得済みとみなす。"""
    if file_type == "tsv":
        p = target_dir / f"{doc_id}.tsv"
        return p.is_file() and p.stat().st_size > 0
    if file_type == "pdf":
        p = target_dir / f"{doc_id}.pdf"
        return p.is_file() and p.stat().st_size > 0
    if file_type == "xbrl":
        d = target_dir / doc_id
        if not d.is_dir():
            return False
        try:
            return any(d.iterdir())
        except OSError:
            return False
    return False


def get_date_range(years: int = 10):
    """過去N年間の日付範囲を取得"""
    today = datetime.date.today()
    end_date = today
    start_date = today - datetime.timedelta(days=365 * years)

    return start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d")


def get_date_range_for_calendar_year(year: int) -> tuple[str, str]:
    """単一暦年の日付範囲（終端は今日でクリップ）。"""
    today = datetime.date.today()
    start = datetime.date(year, 1, 1)
    end = datetime.date(year, 12, 31)
    if end > today:
        end = today
    if start > end:
        ts = today.strftime("%Y-%m-%d")
        return ts, ts
    return start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d")


def _normalize_codes(codes: list[str]) -> list[str]:
    normalized = []
    seen = set()
    for code in codes:
        c = code.strip()
        if not c:
            continue
        if c not in seen:
            seen.add(c)
            normalized.append(c)
    return normalized


def _load_codes_from_json(path: str) -> list[str]:
    with open(path, "r", encoding="utf-8") as f:
        companies = json.load(f)
    if not isinstance(companies, list):
        raise ValueError("companies_json must be a JSON array")
    codes = []
    for item in companies:
        if not isinstance(item, dict):
            continue
        code = item.get("edinetCode")
        if isinstance(code, str):
            codes.append(code)
    return _normalize_codes(codes)


def resolve_target_codes(args) -> list[str]:
    codes: list[str] = []
    if args.edinet_code:
        codes.append(args.edinet_code)
    if args.edinet_codes:
        codes.extend(args.edinet_codes)
    if args.companies_json:
        codes.extend(_load_codes_from_json(args.companies_json))
    return _normalize_codes(codes)


def download_company_data(
    edinet_code: str,
    output_dir: str = "data",
    file_type: str = "tsv",
    years: int = 10,
    doc_types: list[str] | None = None,
    skip_existing: bool = True,
    calendar_year: int | None = None,
) -> tuple[list[str], list[str]]:
    """指定された企業の過去N年分のデータをダウンロード。
    calendar_year を指定した場合はその暦年のみ（CI マトリックス用）。
    戻り値: (新規ダウンロードした docID のリスト, スキップした docID のリスト)
    """

    if not doc_types:
        doc_types = list(DEFAULT_DOC_TYPES)
    logger.info(f"Starting download for company: {edinet_code}")
    if calendar_year is not None:
        logger.info(f"Calendar year: {calendar_year}")
    else:
        logger.info(f"Downloading {years} years of reports")
    logger.info(f"Document types: {', '.join(doc_types)}")

    # 日付範囲を取得
    if calendar_year is not None:
        start_date, end_date = get_date_range_for_calendar_year(calendar_year)
    else:
        start_date, end_date = get_date_range(years)
    logger.info(f"Date range: {start_date} to {end_date}")

    # Downloaderを初期化
    downloader = Downloader()

    # 有価証券報告書を取得
    logger.info("Fetching document list...")
    results = downloader.get_results(start_date, end_date, edinet_code=edinet_code)

    if not results:
        logger.warning(f"No documents found for {edinet_code} in the specified period")
        return [], []

    logger.info(f"Found {len(results)} documents")

    # 指定書類種別のみをフィルタリング
    filtered_results = []
    for result in results:
        doc_type = downloader.get_doc_type_from_result(result)
        if doc_type in doc_types:
            filtered_results.append(result)

    logger.info(f"Found {len(filtered_results)} matching reports")

    if not filtered_results:
        logger.warning("No matching reports found")
        return [], []

    # 出力ディレクトリを作成
    company_dir = Path(output_dir) / edinet_code
    company_dir.mkdir(parents=True, exist_ok=True)

    metadata_basename = (
        f"metadata_{calendar_year}.json" if calendar_year is not None else "metadata.json"
    )

    # メタデータを保存
    metadata = {
        "edinet_code": edinet_code,
        "download_date": datetime.datetime.now().isoformat(),
        "date_range": {"start": start_date, "end": end_date},
        "calendar_year": calendar_year,
        "doc_types": doc_types,
        "file_type": file_type,
        "skip_existing": skip_existing,
        "total_documents": len(filtered_results),
        "downloaded_count": 0,
        "skipped_count": 0,
        "documents": [],
    }

    # 各書類をダウンロード
    downloaded_files: list[str] = []
    skipped_files: list[str] = []
    for i, result in enumerate(filtered_results, 1):
        detected_doc_type = downloader.get_doc_type_from_result(result)
        target_dir = company_dir / detected_doc_type
        target_dir.mkdir(parents=True, exist_ok=True)

        # build_screener_data.py は各 TSV と同名の {docID}.json（API Result 形式）を参照する
        sidecar_json = target_dir / f"{result.docID}.json"

        if (
            skip_existing
            and _artifact_exists(target_dir, result.docID, file_type)
        ):
            if not sidecar_json.is_file():
                sidecar_json.write_text(
                    json.dumps(result.to_dict(), ensure_ascii=False, indent=2),
                    encoding="utf-8",
                )
                logger.info(f"Wrote missing sidecar: {sidecar_json.name}")
            logger.info(
                f"[{i}/{len(filtered_results)}] Skip (already exists): "
                f"{result.docID} ({detected_doc_type}) - {result.docDescription}"
            )
            metadata["documents"].append(
                {
                    "docID": result.docID,
                    "doc_type": detected_doc_type,
                    "docDescription": result.docDescription,
                    "periodStart": result.periodStart,
                    "periodEnd": result.periodEnd,
                    "submitDateTime": result.submitDateTime,
                    "file_type": file_type,
                    "output_dir": str(target_dir),
                    "skipped": True,
                }
            )
            skipped_files.append(result.docID)
            metadata["skipped_count"] += 1
            continue

        logger.info(
            f"Downloading [{i}/{len(filtered_results)}]: "
            f"{result.docID} ({detected_doc_type}) - {result.docDescription}"
        )

        try:
            # 書類をダウンロード
            downloader.download_document(
                result.docID, file_type=file_type, output_dir=str(target_dir)
            )

            sidecar_json.write_text(
                json.dumps(result.to_dict(), ensure_ascii=False, indent=2),
                encoding="utf-8",
            )

            # メタデータに追加
            doc_metadata = {
                "docID": result.docID,
                "doc_type": detected_doc_type,
                "docDescription": result.docDescription,
                "periodStart": result.periodStart,
                "periodEnd": result.periodEnd,
                "submitDateTime": result.submitDateTime,
                "file_type": file_type,
                "output_dir": str(target_dir),
                "skipped": False,
            }
            metadata["documents"].append(doc_metadata)
            downloaded_files.append(result.docID)
            metadata["downloaded_count"] += 1

            logger.info(f"Successfully downloaded: {result.docID}")

        except Exception as e:
            logger.error(f"Failed to download {result.docID}: {e}")
            continue

    # メタデータを保存
    metadata_file = company_dir / metadata_basename
    with open(metadata_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    logger.info(f"Metadata saved to {metadata_file}")
    logger.info(
        f"New: {len(downloaded_files)}, skipped: {len(skipped_files)} "
        f"under {company_dir}"
    )

    return downloaded_files, skipped_files


def main():
    args = parse_args()

    # EDINET APIキーの確認
    if not os.environ.get("EDINET_API_KEY"):
        logger.error("EDINET_API_KEY environment variable is not set")
        sys.exit(1)

    target_codes = resolve_target_codes(args)
    if not target_codes:
        logger.error(
            "No EDINET codes specified. Use --edinet_code, --edinet_codes, or --companies_json."
        )
        sys.exit(1)

    total_downloaded = 0
    total_skipped = 0
    for code in target_codes:
        downloaded_files, skipped_files = download_company_data(
            edinet_code=code,
            output_dir=args.output_dir,
            file_type=args.file_type,
            years=args.years,
            doc_types=args.doc_types,
            skip_existing=not args.force,
            calendar_year=args.year,
        )
        total_downloaded += len(downloaded_files)
        total_skipped += len(skipped_files)

    if total_downloaded > 0 or total_skipped > 0:
        logger.info(
            f"Done: {total_downloaded} new file(s), {total_skipped} skipped "
            f"across {len(target_codes)} company/companies"
        )
        sys.exit(0)

    logger.warning("No files were downloaded or skipped (no matching documents?)")
    sys.exit(1)


if __name__ == "__main__":
    main()
