from argparse import ArgumentParser
import os
import json
from pathlib import Path

# .env を読み込む（edinet-wrapper/.env）
try:
    from dotenv import load_dotenv

    project_root = Path(__file__).resolve().parent.parent.parent
    load_dotenv(project_root / ".env")
except ImportError:
    pass

from edinet_wrapper import Downloader
from concurrent.futures import ThreadPoolExecutor, as_completed
from tqdm import tqdm
from loguru import logger


def parse_args():
    parser = ArgumentParser("Download reports published between start_date and end_date")
    parser.add_argument("--start_date", type=str, default="2025-01-01")
    parser.add_argument("--end_date", type=str, default="2025-03-01")
    parser.add_argument("--output_dir", type=str, default="edinet_corpus", help="Output directory")
    parser.add_argument(
        "--doc_type",
        type=str,
        default="annual",
        help="Document type to download (年次/四半期/半期/大量保有)",
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
    )
    parser.add_argument(
        "--listed_only",
        action="store_true",
        help="上場企業のみ（ファンド等を除外）",
    )
    parser.add_argument(
        "--max_workers",
        type=int,
        default=1,
        help="Number of threads for parallel download",
    )
    parser.add_argument(
        "--request_delay",
        type=float,
        default=None,
        metavar="SEC",
        help="EDINET API リクエスト間隔（秒）。未指定時は環境変数 EDINET_REQUEST_DELAY または 3.0",
    )
    parser.add_argument(
        "--skip_existing_companies",
        action="store_true",
        help=(
            "output_dir/<doc_type>/<edinet_code>/ に既にファイルがある企業は、その期間内の書類をすべてスキップする"
        ),
    )
    return parser.parse_args()


def _company_dir_has_content(dir_path: str) -> bool:
    p = Path(dir_path)
    if not p.is_dir():
        return False
    return any(p.iterdir())


def process_result(result, downloader, output_dir, doc_type, skip_existing_companies: bool) -> None:
    try:
        if downloader.get_doc_type_from_result(result) != doc_type:
            return

        if result.withdrawalStatus == "1":
            return
        edinet_code = result.edinetCode
        path = os.path.join(output_dir, doc_type, edinet_code)

        if skip_existing_companies and _company_dir_has_content(path):
            logger.info(f"Skip {edinet_code}: company dir already has files (--skip_existing_companies)")
            return

        if os.path.exists(os.path.join(path, f"{result.docID}.json")):
            logger.info(f"Skip {edinet_code}: already exists")
            return

        os.makedirs(path, exist_ok=True)

        downloader.download_document(result.docID, "tsv", path)
        downloader.download_document(result.docID, "pdf", path)

        with open(os.path.join(path, f"{result.docID}.json"), "w", encoding="utf-8") as f:
            json.dump(result.to_dict(), f, ensure_ascii=False, indent=4)

        logger.info(f"Downloaded {result.docID} to {path}")
    except Exception as e:
        logger.error(f"Error processing {result.docID}: {e}")
        return None


if __name__ == "__main__":
    args = parse_args()
    skip_companies = args.skip_existing_companies or os.environ.get(
        "SKIP_EXISTING_COMPANIES", ""
    ).strip().lower() in ("1", "true", "yes")
    # Downloader は cwd の data/ に EdinetcodeDlInfo を置く
    project_root = Path(__file__).resolve().parent.parent.parent
    (project_root / "data").mkdir(parents=True, exist_ok=True)
    downloader = Downloader(request_delay_sec=args.request_delay)
    results = downloader.get_results(
        args.start_date, args.end_date, listed_only=args.listed_only
    )

    with ThreadPoolExecutor(max_workers=args.max_workers) as executor:
        futures = [
            executor.submit(
                process_result,
                result,
                downloader,
                args.output_dir,
                args.doc_type,
                skip_companies,
            )
            for result in results
        ]

        with tqdm(total=len(futures), desc="Downloading") as pbar:
            for future in as_completed(futures):
                result_msg = future.result()
                pbar.update(1)
