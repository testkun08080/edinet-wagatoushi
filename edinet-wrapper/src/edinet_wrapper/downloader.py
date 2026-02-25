"""
EDINET API で書類一覧・TSV/PDF 取得を行うダウンローダー。
リトライ・非JSONレスポンス対応済み。このファイルを編集して維持する。
"""

import json
import time
import requests
import datetime
import shutil
import os
from tqdm import tqdm

from edinet_wrapper.schema import Response, Result
import argparse
import tempfile
import zipfile
import io
import polars as pl
from loguru import logger

pl.Config.set_tbl_cols(-1)


def download_edinetinfo_csv(dir: str = "data"):
    url = "https://disclosure2dl.edinet-fsa.go.jp/searchdocument/codelist/Edinetcode.zip"
    if os.path.exists(os.path.join(dir, "EdinetcodeDlInfo.zip")):
        logger.error("File already exists. Skipping download.")
        return
    with requests.get(url) as res:
        with open(os.path.join(dir, "EdinetcodeDlInfo.zip"), "wb") as file:
            file.write(res.content)
            logger.info("Downloaded EdinetcodeDlInfo.zip")
    # Unzip
    with zipfile.ZipFile(os.path.join(dir, "EdinetcodeDlInfo.zip"), "r") as existing_zip:
        existing_zip.extractall(dir)


def search_company(edinet_code_info: pl.DataFrame, query: str) -> pl.DataFrame | None:
    """Search for a company by name and return its EDINET code."""
    result = edinet_code_info.filter(pl.col("提出者名").str.contains(query))
    if result.is_empty():
        return None
    return result.select([
        "提出者名",
        "ＥＤＩＮＥＴコード",
        "提出者業種",
    ])


# 仕様書の書類種別コード → ラッパー doc_type（機関・書類種別でダウンロード用）
# 参考: https://disclosure2dl.edinet-fsa.go.jp/guide/static/disclosure/download/ESE140206.pdf
DOC_TYPE_CODE_MAP = {
    "120": "annual",           # 有価証券報告書（年次）
    "130": "annual_amended",    # 訂正有価証券報告書
    "140": "quarterly",        # 四半期報告書
    "150": "quarterly_amended",
    "160": "semiannual",       # 半期報告書
    "170": "semiannual_amended",
    "350": "large_holding",   # 大量保有報告書（府令060）
    "360": "large_holding_amended",
}


class Downloader:
    def __init__(self):
        # 仕様書では api.edinet-fsa.go.jp。disclosure. も同一応答の可能性あり。
        self.base_url = "https://api.edinet-fsa.go.jp/api/v2/documents.json"
        self._doc_base_url = "https://api.edinet-fsa.go.jp/api/v2/documents"
        self.edinet_code_info = self._load_edinet_code_info()
        raw_key = os.environ.get("EDINET_API_KEY")
        assert raw_key is not None, "EDINET_API_KEY is not set"
        # GitHub Secrets / .env で末尾改行が入ることがあるため strip（%0A で 403 になる）
        self.edinet_api_key = raw_key.strip()

    @staticmethod
    def _load_edinet_code_info() -> pl.DataFrame:
        # df contains the following columns:
        # ＥＤＩＮＥＴコード,提出者種別,上場区分,連結の有無,資本金,決算日,提出者名,提出者名（英字）,提出者名（ヨミ）,所在地,提出者業種,証券コード,提出者法人番号

        file_path = "data/EdinetcodeDlInfo.csv"
        if not os.path.exists(file_path):
            download_edinetinfo_csv()

        with open(file_path, "r", encoding="shift_jis", errors="replace") as f:
            content = f.read()

        df = pl.read_csv(
            content.encode("utf-8"),
            encoding="utf8",
            skip_rows=1,  # skip the first row
        )
        return df

    @staticmethod
    def make_day_list(start_date: datetime.date, end_date: datetime.date) -> list[datetime.date]:
        period = end_date - start_date
        period = int(period.days)
        day_list = []
        for d in range(period):
            day = start_date + datetime.timedelta(days=d)
            day_list.append(day)
        day_list.append(end_date)
        return day_list

    _GET_RESPONSE_MAX_RETRIES = 5
    _GET_RESPONSE_RETRY_DELAY = 60  # 秒（レート制限・一時的な API 不調対策）

    @staticmethod
    def get_response(url: str, date: datetime.date, type: int, key: str) -> dict:
        # type: 1:metadata only, 2:metadata and results
        params = {"date": date, "type": type, "Subscription-Key": key}
        for attempt in range(Downloader._GET_RESPONSE_MAX_RETRIES):
            res = requests.get(url, params=params)
            try:
                if res.status_code != 200:
                    logger.warning(
                        f"EDINET API status {res.status_code} (attempt {attempt + 1}/{Downloader._GET_RESPONSE_MAX_RETRIES}), body: {res.text[:300]}"
                    )
                    if attempt < Downloader._GET_RESPONSE_MAX_RETRIES - 1:
                        time.sleep(Downloader._GET_RESPONSE_RETRY_DELAY)
                        continue
                    res.raise_for_status()
                return res.json()
            except (json.JSONDecodeError, requests.exceptions.JSONDecodeError):
                logger.warning(
                    f"EDINET API non-JSON response (attempt {attempt + 1}/{Downloader._GET_RESPONSE_MAX_RETRIES}), status={res.status_code}, body: {res.text[:500]}"
                )
                if attempt < Downloader._GET_RESPONSE_MAX_RETRIES - 1:
                    time.sleep(Downloader._GET_RESPONSE_RETRY_DELAY)
                    continue
                raise
        raise RuntimeError("get_response: max retries exceeded")

    def get_edinet_code(self, company_name: str) -> str:
        edinet_code = (
            self.edinet_code_info.filter(pl.col("提出者名") == company_name)
            .select(["ＥＤＩＮＥＴコード"])
            .to_numpy()
            .item(0)
        )
        return edinet_code

    @staticmethod
    def get_doc_type(ordinanceCode: str, formCode: str) -> str:
        """府令コード＋様式コードから doc_type を返す（様式ベース）。"""
        match (ordinanceCode, formCode):
            case ("010", "030000"):
                return "annual"
            case ("010", "030001"):
                return "annual_amended"
            case ("010", "043000"):
                return "quarterly"
            case ("010", "043001"):
                return "quarterly_amended"
            case ("010", "043A00"):
                return "semiannual"
            case ("010", "043A01"):
                return "semiannual_amended"
            case ("060", _):
                # 府令060: 株券等の大量保有の状況の開示
                return "large_holding"
            case _:
                return "unknown"

    @staticmethod
    def get_doc_type_from_result(result: Result) -> str:
        """API の書類種別コード（docTypeCode）から doc_type を返す。大量保有なども docTypeCode で判定。"""
        code = (result.docTypeCode or "").strip()
        if code in DOC_TYPE_CODE_MAP:
            return DOC_TYPE_CODE_MAP[code]
        return Downloader.get_doc_type(result.ordinanceCode or "", result.formCode or "")

    def get_results(
        self,
        start_date: str,
        end_date: str,
        edinet_code: str | None = None,
        listed_only: bool = False,
    ) -> list[Result]:
        """書類一覧を取得。listed_only=True のときは上場区分が「上場」の提出者のみに絞る（EDINETコードリストと照合）。"""
        day_list = self.make_day_list(
            datetime.datetime.strptime(start_date, "%Y-%m-%d").date(),
            datetime.datetime.strptime(end_date, "%Y-%m-%d").date(),
        )
        result_list = []
        for day in tqdm(day_list, desc=f"Downloading documents ({start_date} - {end_date})"):
            json_data = self.get_response(
                self.base_url,
                day,
                2,
                self.edinet_api_key,
            )
            if not json_data.get("results"):
                continue
            response = Response(json_data)
            result_list.extend(response.results)
        if edinet_code is not None:
            result_list = [r for r in result_list if r.edinetCode == edinet_code]
        if listed_only and result_list:
            listed_codes = set(
                self.edinet_code_info.filter(pl.col("上場区分") == "上場")
                .select("ＥＤＩＮＥＴコード")
                .to_series()
                .to_list()
            )
            result_list = [r for r in result_list if (r.edinetCode or "") in listed_codes]
        return result_list

    def download_document(self, doc_id, file_type="tsv", output_dir="data") -> None:
        match file_type:
            case "pdf":
                self._download_document_in_pdf(doc_id, output_dir)
            case "tsv":
                self._download_document_in_tsv(doc_id, output_dir)
            case "xbrl":
                self._download_document_in_xbrl(doc_id, output_dir)
            case _:
                raise ValueError(f"Unknown file type: {file_type}")

    def _download_document_in_pdf(self, doc_id: str, output_dir: str = "data") -> None:
        """Retrieve a specific document from EDINET API. type: 2 for PDF"""
        url = f"{self._doc_base_url}/{doc_id}"
        params = {"type": 2, "Subscription-Key": self.edinet_api_key}
        with requests.get(url, params=params) as res:
            with open(os.path.join(output_dir, f"{doc_id}.pdf"), "wb") as f:
                f.write(res.content)
        logger.info(f"Downloaded {doc_id}.pdf to {output_dir}")

    def _download_document_in_xbrl(self, doc_id: str, output_dir: str = "data") -> None:
        """Retrieve a specific document from EDINET API. type: 1 for XBRL"""
        url = f"{self._doc_base_url}/{doc_id}"
        params = {"type": 1, "Subscription-Key": self.edinet_api_key}
        # zip download
        try:
            with requests.get(url, params=params) as res:
                with tempfile.TemporaryDirectory() as tmp_dir:
                    with zipfile.ZipFile(io.BytesIO(res.content)) as z:
                        for file in z.namelist():
                            z.extract(file, tmp_dir)
                            output_file = os.path.join(output_dir, f"{doc_id}", file)
                            os.makedirs(os.path.dirname(output_file), exist_ok=True)
                            shutil.move(
                                os.path.join(tmp_dir, file),
                                output_file,
                            )
        except Exception as e:
            logger.error(f"Error downloading document {doc_id}: {e}")
            return None
        logger.info(f"Downloaded {doc_id}.xbrl to {output_dir}")

    def _download_document_in_tsv(self, doc_id: str, output_dir: str = "data") -> None:
        """Retrieve a specific document from EDINET API. type: 5 for CSV"""
        url = f"{self._doc_base_url}/{doc_id}"
        params = {"type": 5, "Subscription-Key": self.edinet_api_key}
        try:
            with requests.get(url, params=params) as res:
                with tempfile.TemporaryDirectory() as tmp_dir:
                    with zipfile.ZipFile(io.BytesIO(res.content)) as z:
                        for file in z.namelist():
                            if file.startswith("XBRL_TO_CSV/jpcrp") and file.endswith(".csv"):
                                z.extract(file, tmp_dir)
                                output_file = os.path.join(output_dir, f"{doc_id}.tsv")
                                if not os.path.exists(output_file):
                                    shutil.move(
                                        os.path.join(tmp_dir, file),
                                        output_file,
                                    )
        except Exception as e:
            logger.error(f"Error downloading document {doc_id}: {e}")
            return None
        logger.info(f"Downloaded {doc_id}.tsv to {output_dir}")


def parse_args():
    parser = argparse.ArgumentParser("Download annual securities published between start_date and end_date")
    parser.add_argument("--start_date", type=str, default="2024-06-01")
    parser.add_argument("--end_date", type=str, default="2024-06-28")
    parser.add_argument(
        "--edinet_code",
        type=str,
        default=None,
        help="If specified, download only the document of the company. Otherwise, download all documents.",
    )
    parser.add_argument(
        "--company_name",
        type=str,
        default="トヨタ自動車株式会社",
        help="Company name to search for EDINET code",
    )
    parser.add_argument("--output_dir", type=str, default="data", help="Output directory")
    parser.add_argument(
        "--doc_type",
        type=str,
        default="annual",
        help="Document type to download (annual, quarterly, semiannual, large_holding, *_amended)",
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
        help="Restrict to listed companies (上場 only), exclude funds etc.",
    )
    parser.add_argument(
        "--file_type",
        type=str,
        default="tsv",
        help="File type to download",
        choices=["pdf", "tsv", "xbrl"],
    )
    parser.add_argument(
        "--query",
        type=str,
        default=None,
        help="Query string to search for a company name",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    downloader = Downloader()

    if args.query:
        result = search_company(downloader.edinet_code_info, args.query)
        if result is None:
            print("No results found.")
            exit()
        print(result)
        exit()

    if args.edinet_code:
        edinet_code = args.edinet_code
    else:
        edinet_code = downloader.get_edinet_code(args.company_name)

    results = downloader.get_results(
        args.start_date, args.end_date, edinet_code, listed_only=args.listed_only
    )
    doc_ids = []

    for result in results:
        if downloader.get_doc_type_from_result(result) == args.doc_type:
            doc_ids.append(result.docID)

    output_dir = os.path.join(args.output_dir, edinet_code)
    os.makedirs(output_dir, exist_ok=True)
    if doc_ids:
        downloader.download_document(doc_ids[0], file_type=args.file_type, output_dir=output_dir)
