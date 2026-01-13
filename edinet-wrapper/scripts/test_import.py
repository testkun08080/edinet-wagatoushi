#!/usr/bin/env python3
"""
edinet2datasetのインポートテストスクリプト

このスクリプトで、edinet2datasetが正しくインポートできるか確認できます。
"""
import sys

def test_imports():
    """インポートテスト"""
    print("=" * 80)
    print("edinet2dataset インポートテスト")
    print("=" * 80)
    
    errors = []
    
    # テスト1: edinet_wrapper経由でインポート
    print("\n【テスト1】edinet_wrapper経由でインポート")
    print("-" * 80)
    try:
        from edinet_wrapper import parse_tsv, FinancialData, download_edinetinfo_csv
        print("✓ edinet_wrapper からのインポート成功")
        print(f"  - parse_tsv: {parse_tsv}")
        print(f"  - FinancialData: {FinancialData}")
        print(f"  - download_edinetinfo_csv: {download_edinetinfo_csv}")
    except ImportError as e:
        error_msg = f"✗ edinet_wrapper からのインポート失敗: {e}"
        print(error_msg)
        errors.append(error_msg)
    
    # テスト2: 直接edinet2datasetからインポート
    print("\n【テスト2】直接edinet2datasetからインポート")
    print("-" * 80)
    try:
        from edinet2dataset.parser import parse_tsv as parse_tsv_direct, FinancialData as FinancialDataDirect
        from edinet2dataset.downloader import download_edinetinfo_csv as download_direct
        print("✓ edinet2dataset からの直接インポート成功")
        print(f"  - parse_tsv: {parse_tsv_direct}")
        print(f"  - FinancialData: {FinancialDataDirect}")
        print(f"  - download_edinetinfo_csv: {download_direct}")
    except ImportError as e:
        error_msg = f"✗ edinet2dataset からの直接インポート失敗: {e}"
        print(error_msg)
        errors.append(error_msg)
    
    # テスト3: 依存関係の確認
    print("\n【テスト3】依存関係の確認")
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
        print("  1. edinet2datasetをインストール: pip install -e ../edinet2dataset")
        print("  2. edinet-wrapperをインストール: pip install -e .")
        print("  3. 依存関係をインストール: pip install -r ../edinet2dataset/requirements.txt")
        return 1
    else:
        print("【結果】すべてのテストが成功しました！")
        print("=" * 80)
        print("\nedinet2datasetを正常に使用できます。")
        print("scripts/example_usage.py を実行して、実際の使用例を確認してください。")
        return 0

if __name__ == "__main__":
    sys.exit(test_imports())
