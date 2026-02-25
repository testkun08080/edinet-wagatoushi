#!/usr/bin/env python3
"""
Postman で EDINET API を叩くときの URL とパラメータを表示する。
API キーは環境変数 EDINET_API_KEY または --api-key で指定。

例:
  uv run python scripts/postman_api_urls.py
  uv run python scripts/postman_api_urls.py --date 2024-06-28
"""
from argparse import ArgumentParser
import os

BASE = "https://api.edinet-fsa.go.jp/api/v2"


def main():
    p = ArgumentParser(description="EDINET API URLs for Postman")
    p.add_argument("--date", default="2024-06-28", help="ファイル日付 YYYY-MM-DD")
    p.add_argument("--doc-id", default="S100ABCD", help="書類取得用の docID（一覧で取得した値に置き換え）")
    p.add_argument("--api-key", default=os.environ.get("EDINET_API_KEY", "YOUR_API_KEY"))
    args = p.parse_args()

    key = args.api_key.strip() if args.api_key else "YOUR_API_KEY"

    print("=== 1. 書類一覧 API（四半期・年次・大量保有の一覧を取得） ===\n")
    print(f"GET {BASE}/documents.json")
    print("Query params:")
    print(f"  date = {args.date}")
    print("  type = 2")
    print(f"  Subscription-Key = {key}")
    print()
    print("URL (copy to Postman):")
    print(f"  {BASE}/documents.json?date={args.date}&type=2&Subscription-Key={key}")
    print()
    print("レスポンスの results[].docTypeCode で判定:")
    print("  120 = 年次（有価証券報告書）, 140 = 四半期, 350 = 大量保有報告書")
    print()

    print("=== 2. 書類取得 API（PDF） ===\n")
    print(f"GET {BASE}/documents/{args.doc_id}")
    print("Query params:")
    print("  type = 2  (2=PDF, 1=XBRL, 5=CSV)")
    print(f"  Subscription-Key = {key}")
    print()
    print("URL (docID は一覧 API で取得した値に置き換え):")
    print(f"  {BASE}/documents/{args.doc_id}?type=2&Subscription-Key={key}")
    print()

    print("=== 3. 書類取得 API（CSV） ===\n")
    print(f"  {BASE}/documents/{args.doc_id}?type=5&Subscription-Key={key}")


if __name__ == "__main__":
    main()
