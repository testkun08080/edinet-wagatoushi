"""
edinet-wrapper: EDINET データ取得・パース用パッケージ

サブモジュールに依存せず、downloader / parser / schema を自前で保持します。
downloader.py を編集して維持してください。
"""

from edinet_wrapper.parser import parse_tsv, FinancialData, Parser
from edinet_wrapper.downloader import (
    download_edinetinfo_csv,
    search_company,
    Downloader,
)
from edinet_wrapper.schema import Response, Result

__all__ = [
    "parse_tsv",
    "FinancialData",
    "Parser",
    "download_edinetinfo_csv",
    "search_company",
    "Downloader",
    "Response",
    "Result",
]

__version__ = "0.1.0"
