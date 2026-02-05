#!/usr/bin/env python3
"""
実際のEDINETデータの構造を詳しく分析するスクリプト
"""

import json
import sys
from pathlib import Path

from edinet_wrapper import parse_tsv, FinancialData

try:
    from loguru import logger
except ImportError:
    import logging

    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)


def analyze_financial_data(financial_data: FinancialData):
    """財務データの構造を詳しく分析"""

    print("=" * 80)
    print("EDINETデータ構造の詳細分析")
    print("=" * 80)

    # 1. META情報の分析
    print("\n【1. META情報（基本情報）】")
    print("-" * 80)
    print(f"項目数: {len(financial_data.meta)}")
    print("\n各項目の詳細:")
    for key, value in financial_data.meta.items():
        print(f"  - {key}: {value}")

    # 2. SUMMARY情報の分析
    print("\n【2. SUMMARY情報（業績サマリー）】")
    print("-" * 80)
    print(f"項目数: {len(financial_data.summary)}")
    print("\n各項目の構造:")
    for key, value in list(financial_data.summary.items())[:10]:  # 最初の10項目
        if isinstance(value, dict):
            print(f"  - {key}:")
            for year, val in value.items():
                print(f"      {year}: {val}")
        else:
            print(f"  - {key}: {value}")
    if len(financial_data.summary) > 10:
        print(f"  ... 他 {len(financial_data.summary) - 10} 項目")

    # 3. TEXT情報の分析
    print("\n【3. TEXT情報（テキストブロック）】")
    print("-" * 80)
    print(f"項目数: {len(financial_data.text)}")
    print("\n各項目の概要:")
    for key, value in list(financial_data.text.items())[:5]:  # 最初の5項目
        if isinstance(value, dict):
            print(f"  - {key}:")
            for year, val in value.items():
                text_preview = str(val)[:100] if val else "None"
                print(f"      {year}: {text_preview}...")
        else:
            text_preview = str(value)[:100] if value else "None"
            print(f"  - {key}: {text_preview}...")
    if len(financial_data.text) > 5:
        print(f"  ... 他 {len(financial_data.text) - 5} 項目")

    # 4. BS（貸借対照表）の分析
    print("\n【4. BS（貸借対照表）】")
    print("-" * 80)
    print(f"項目数: {len(financial_data.bs)}")
    print("\n主要項目の構造:")
    bs_items = list(financial_data.bs.items())[:15]  # 最初の15項目
    for key, value in bs_items:
        if isinstance(value, dict):
            print(f"  - {key}:")
            for year, val in value.items():
                print(f"      {year}: {val}")
        else:
            print(f"  - {key}: {value}")
    if len(financial_data.bs) > 15:
        print(f"  ... 他 {len(financial_data.bs) - 15} 項目")

    # 5. PL（損益計算書）の分析
    print("\n【5. PL（損益計算書）】")
    print("-" * 80)
    print(f"項目数: {len(financial_data.pl)}")
    print("\n主要項目の構造:")
    pl_items = list(financial_data.pl.items())[:15]  # 最初の15項目
    for key, value in pl_items:
        if isinstance(value, dict):
            print(f"  - {key}:")
            for year, val in value.items():
                print(f"      {year}: {val}")
        else:
            print(f"  - {key}: {value}")
    if len(financial_data.pl) > 15:
        print(f"  ... 他 {len(financial_data.pl) - 15} 項目")

    # 6. CF（キャッシュフロー計算書）の分析
    print("\n【6. CF（キャッシュフロー計算書）】")
    print("-" * 80)
    print(f"項目数: {len(financial_data.cf)}")
    print("\n主要項目の構造:")
    cf_items = list(financial_data.cf.items())[:15]  # 最初の15項目
    for key, value in cf_items:
        if isinstance(value, dict):
            print(f"  - {key}:")
            for year, val in value.items():
                print(f"      {year}: {val}")
        else:
            print(f"  - {key}: {value}")
    if len(financial_data.cf) > 15:
        print(f"  ... 他 {len(financial_data.cf) - 15} 項目")

    # 7. データ型の統計
    print("\n【7. データ型の統計】")
    print("-" * 80)

    def count_types(data_dict):
        type_counts = {}
        for key, value in data_dict.items():
            if isinstance(value, dict):
                type_counts["dict"] = type_counts.get("dict", 0) + 1
            elif isinstance(value, str):
                type_counts["str"] = type_counts.get("str", 0) + 1
            elif isinstance(value, (int, float)):
                type_counts["numeric"] = type_counts.get("numeric", 0) + 1
            else:
                type_counts["other"] = type_counts.get("other", 0) + 1
        return type_counts

    print("META:")
    print(f"  {count_types(financial_data.meta)}")
    print("SUMMARY:")
    print(f"  {count_types(financial_data.summary)}")
    print("TEXT:")
    print(f"  {count_types(financial_data.text)}")
    print("BS:")
    print(f"  {count_types(financial_data.bs)}")
    print("PL:")
    print(f"  {count_types(financial_data.pl)}")
    print("CF:")
    print(f"  {count_types(financial_data.cf)}")

    # 8. 年度データの有無確認
    print("\n【8. 年度データの有無】")
    print("-" * 80)
    years = ["Prior4Year", "Prior3Year", "Prior2Year", "Prior1Year", "CurrentYear"]

    def check_years(data_dict):
        year_presence = {year: False for year in years}
        for key, value in data_dict.items():
            if isinstance(value, dict):
                for year in years:
                    if year in value:
                        year_presence[year] = True
        return year_presence

    print("SUMMARY:")
    for year, present in check_years(financial_data.summary).items():
        print(f"  {year}: {'✓' if present else '✗'}")
    print("BS:")
    for year, present in check_years(financial_data.bs).items():
        print(f"  {year}: {'✓' if present else '✗'}")
    print("PL:")
    for year, present in check_years(financial_data.pl).items():
        print(f"  {year}: {'✓' if present else '✗'}")
    print("CF:")
    for year, present in check_years(financial_data.cf).items():
        print(f"  {year}: {'✓' if present else '✗'}")

    # 9. JSON形式で保存（構造確認用）
    output_file = Path("data_structure_sample.json")
    output_data = {
        "meta": financial_data.meta,
        "summary_sample": dict(list(financial_data.summary.items())[:5]),
        "text_sample": {
            k: (str(v)[:200] + "..." if isinstance(v, str) and len(str(v)) > 200 else v)
            for k, v in list(financial_data.text.items())[:3]
        },
        "bs_sample": dict(list(financial_data.bs.items())[:10]),
        "pl_sample": dict(list(financial_data.pl.items())[:10]),
        "cf_sample": dict(list(financial_data.cf.items())[:10]),
    }

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print(f"\n【9. サンプルデータの保存】")
    print("-" * 80)
    print(f"サンプルデータを {output_file} に保存しました")

    print("\n" + "=" * 80)
    print("分析完了")
    print("=" * 80)


if __name__ == "__main__":
    # トヨタ自動車のTSVファイルをパース
    # edinet-wrapperのルートからの相対パス
    script_dir = Path(__file__).parent
    tsv_file = script_dir.parent / "data" / "E02144" / "S100TR7I.tsv"

    if not Path(tsv_file).exists():
        logger.error(f"TSVファイルが見つかりません: {tsv_file}")
        sys.exit(1)

    logger.info(f"TSVファイルをパース中: {tsv_file}")
    financial_data = parse_tsv(tsv_file)

    if financial_data is None:
        logger.error("財務データのパースに失敗しました（連結決算ではない可能性があります）")
        sys.exit(1)

    analyze_financial_data(financial_data)
