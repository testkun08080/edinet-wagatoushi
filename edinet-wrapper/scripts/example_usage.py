#!/usr/bin/env python3
"""
edinet2datasetを使用するサンプルスクリプト

このスクリプトは edinet-wrapper 内で実行できます。
edinet2dataset をモジュールとして使用しています。
"""
import sys
from pathlib import Path

# edinet_wrapperをインポート（edinet2datasetの機能が使える）
from edinet_wrapper import parse_tsv, FinancialData, download_edinetinfo_csv

# または直接 edinet2dataset をインポートすることも可能
# from edinet2dataset.parser import parse_tsv, FinancialData


def main():
    """サンプルスクリプトのメイン処理"""
    print("=" * 80)
    print("edinet-wrapper サンプルスクリプト")
    print("=" * 80)
    
    # 例1: EDINETコード情報をダウンロード
    print("\n【例1】EDINETコード情報のダウンロード")
    print("-" * 80)
    data_dir = Path(__file__).parent.parent.parent / "edinet2dataset" / "data"
    print(f"データディレクトリ: {data_dir}")
    # download_edinetinfo_csv(str(data_dir))
    
    # 例2: TSVファイルをパース
    print("\n【例2】TSVファイルのパース")
    print("-" * 80)
    tsv_file = Path(__file__).parent.parent.parent / "edinet2dataset" / "data" / "E02144" / "S100TR7I.tsv"
    
    if tsv_file.exists():
        print(f"TSVファイルをパース中: {tsv_file}")
        financial_data = parse_tsv(str(tsv_file))
        
        if financial_data:
            print(f"✓ パース成功")
            print(f"  - META項目数: {len(financial_data.meta)}")
            print(f"  - SUMMARY項目数: {len(financial_data.summary)}")
            print(f"  - BS項目数: {len(financial_data.bs)}")
            print(f"  - PL項目数: {len(financial_data.pl)}")
            print(f"  - CF項目数: {len(financial_data.cf)}")
        else:
            print("✗ パース失敗（連結決算ではない可能性があります）")
    else:
        print(f"✗ TSVファイルが見つかりません: {tsv_file}")
        print("  サンプルデータを用意してください。")
    
    print("\n" + "=" * 80)
    print("サンプルスクリプト完了")
    print("=" * 80)


if __name__ == "__main__":
    main()
