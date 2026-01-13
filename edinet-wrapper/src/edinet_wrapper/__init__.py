"""
edinet-wrapper: edinet2datasetモジュールのラッパー

edinet2datasetをモジュールとして使用するためのラッパーパッケージです。
"""

# edinet2datasetの主要な機能を再エクスポート
from edinet2dataset.parser import parse_tsv, FinancialData, Parser
from edinet2dataset.downloader import (
    download_edinetinfo_csv,
    search_company,
    download_document,
)
from edinet2dataset.schema import Response, Result

__all__ = [
    "parse_tsv",
    "FinancialData",
    "Parser",
    "download_edinetinfo_csv",
    "search_company",
    "download_document",
    "Response",
    "Result",
]

__version__ = "0.1.0"
