#!/usr/bin/env python3
"""
edinet_wrapper のインポートテストスクリプト

このスクリプトで、edinet_wrapper が正しくインポートできるか確認できます。
"""

import sys


def test_imports():
    """インポートテスト"""
    print("=" * 80)
    print("edinet_wrapper インポートテスト")
    print("=" * 80)

    errors = []

    # テスト1: edinet_wrapper のインポート
    print("\n【テスト1】edinet_wrapper のインポート")
    print("-" * 80)
    try:
        from edinet_wrapper import (
            parse_tsv,
            FinancialData,
            download_edinetinfo_csv,
            search_company,
            Downloader,
        )

        print("✓ edinet_wrapper からのインポート成功")
        print(f"  - parse_tsv: {parse_tsv}")
        print(f"  - FinancialData: {FinancialData}")
        print(f"  - download_edinetinfo_csv: {download_edinetinfo_csv}")
        print(f"  - search_company: {search_company}")
        print(f"  - Downloader: {Downloader}")
    except ImportError as e:
        error_msg = f"✗ edinet_wrapper からのインポート失敗: {e}"
        print(error_msg)
        errors.append(error_msg)

    # テスト2: 依存関係の確認
    print("\n【テスト2】依存関係の確認")
    print("-" * 80)
    dependencies = [
        "polars",
        "loguru",
        "requests",
        "tqdm",
    ]

    for dep in dependencies:
        try:
            __import__(dep)
            print(f"✓ {dep} がインストールされています")
        except ImportError:
            error_msg = f"✗ {dep} がインストールされていません"
            print(error_msg)
            errors.append(error_msg)

    # 結果サマリー
    print("\n" + "=" * 80)
    if errors:
        print("【結果】一部のテストが失敗しました")
        print("-" * 80)
        for error in errors:
            print(f"  {error}")
        print("\n対処方法:")
        print("  1. edinet-wrapper で uv sync: cd edinet-wrapper && uv sync")
        return 1
    else:
        print("【結果】すべてのテストが成功しました！")
        print("=" * 80)
        print("\nedinet_wrapper を正常に使用できます。")
        print("scripts/example_usage.py を実行して、実際の使用例を確認してください。")
        return 0


if __name__ == "__main__":
    sys.exit(test_imports())
