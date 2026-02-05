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

    project_root = Path(__file__).parent.parent
    load_dotenv(project_root / ".env")
except ImportError:
    pass

from edinet_wrapper import Downloader


def parse_args():
    parser = ArgumentParser("Download 10 years of annual reports for a specified company")
    parser.add_argument(
        "--edinet_code",
        type=str,
        required=True,
        help="EDINET code of the company (e.g., E02144)",
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
        help="Number of years to download (default: 10)",
    )
    return parser.parse_args()


def get_date_range(years: int = 10):
    """過去N年間の日付範囲を取得"""
    today = datetime.date.today()
    end_date = today
    start_date = today - datetime.timedelta(days=365 * years)

    return start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d")


def download_company_data(
    edinet_code: str,
    output_dir: str = "data",
    file_type: str = "tsv",
    years: int = 10,
):
    """指定された企業の10年間分のデータをダウンロード"""

    logger.info(f"Starting download for company: {edinet_code}")
    logger.info(f"Downloading {years} years of annual reports")

    # 日付範囲を取得
    start_date, end_date = get_date_range(years)
    logger.info(f"Date range: {start_date} to {end_date}")

    # Downloaderを初期化
    downloader = Downloader()

    # 有価証券報告書を取得
    logger.info("Fetching document list...")
    results = downloader.get_results(start_date, end_date, edinet_code=edinet_code)

    if not results:
        logger.warning(f"No documents found for {edinet_code} in the specified period")
        return []

    logger.info(f"Found {len(results)} documents")

    # 有価証券報告書（annual）のみをフィルタリング
    annual_results = []
    for result in results:
        doc_type = downloader.get_doc_type(result.ordinanceCode, result.formCode)
        if doc_type == "annual":
            annual_results.append(result)

    logger.info(f"Found {len(annual_results)} annual reports")

    if not annual_results:
        logger.warning("No annual reports found")
        return []

    # 出力ディレクトリを作成
    company_dir = Path(output_dir) / edinet_code
    company_dir.mkdir(parents=True, exist_ok=True)

    # メタデータを保存
    metadata = {
        "edinet_code": edinet_code,
        "download_date": datetime.datetime.now().isoformat(),
        "date_range": {"start": start_date, "end": end_date},
        "total_documents": len(annual_results),
        "documents": [],
    }

    # 各書類をダウンロード
    downloaded_files = []
    for i, result in enumerate(annual_results, 1):
        logger.info(f"Downloading [{i}/{len(annual_results)}]: {result.docID} - {result.docDescription}")

        try:
            # 書類をダウンロード
            downloader.download_document(result.docID, file_type=file_type, output_dir=str(company_dir))

            # メタデータに追加
            doc_metadata = {
                "docID": result.docID,
                "docDescription": result.docDescription,
                "periodStart": result.periodStart,
                "periodEnd": result.periodEnd,
                "submitDateTime": result.submitDateTime,
                "file_type": file_type,
            }
            metadata["documents"].append(doc_metadata)
            downloaded_files.append(result.docID)

            logger.info(f"Successfully downloaded: {result.docID}")

        except Exception as e:
            logger.error(f"Failed to download {result.docID}: {e}")
            continue

    # メタデータを保存
    metadata_file = company_dir / "metadata.json"
    with open(metadata_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    logger.info(f"Metadata saved to {metadata_file}")
    logger.info(f"Downloaded {len(downloaded_files)} files to {company_dir}")

    return downloaded_files


def main():
    args = parse_args()

    # EDINET APIキーの確認
    if not os.environ.get("EDINET_API_KEY"):
        logger.error("EDINET_API_KEY environment variable is not set")
        sys.exit(1)

    # データをダウンロード
    downloaded_files = download_company_data(
        edinet_code=args.edinet_code,
        output_dir=args.output_dir,
        file_type=args.file_type,
        years=args.years,
    )

    if downloaded_files:
        logger.info(f"Successfully downloaded {len(downloaded_files)} files")
        sys.exit(0)
    else:
        logger.warning("No files were downloaded")
        sys.exit(1)


if __name__ == "__main__":
    main()
