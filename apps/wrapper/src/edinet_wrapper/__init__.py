"""
edinet-wrapper: EDINET データ取得・パース用パッケージ

サブモジュールに依存せず、downloader / parser / schema を自前で保持します。
downloader.py を編集して維持してください。
"""

from edinet_wrapper.downloader import (
    Downloader,
    download_edinetinfo_csv,
    search_company,
)
from edinet_wrapper.parser import FinancialData, Parser, parse_tsv
from edinet_wrapper.schema import Response, Result

__all__ = [
    "Downloader",
    "FinancialData",
    "Parser",
    "Response",
    "Result",
    "download_edinetinfo_csv",
    "parse_tsv",
    "search_company",
]

__version__ = "0.1.0"
