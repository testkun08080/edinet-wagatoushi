#!/usr/bin/env python3
"""
TSVファイルの構造を直接分析するスクリプト（依存関係不要）
"""
import csv
import json
from collections import defaultdict
from pathlib import Path

def analyze_tsv_structure(tsv_file):
    """TSVファイルの構造を詳しく分析"""
    
    print("=" * 80)
    print("EDINET TSVファイル構造の詳細分析")
    print("=" * 80)
    
    # TSVファイルを読み込み
    rows = []
    with open(tsv_file, 'r', encoding='utf-16') as f:
        reader = csv.DictReader(f, delimiter='\t')
        for row in reader:
            rows.append(row)
    
    print(f"\n総行数: {len(rows)}")
    print(f"カラム: {list(rows[0].keys()) if rows else 'None'}")
    
    # 1. コンテキストIDの種類を分析
    print("\n【1. コンテキストIDの種類】")
    print("-" * 80)
    context_ids = set()
    context_year_map = defaultdict(set)
    for row in rows:
        context_id = row.get('コンテキストID', '')
        context_ids.add(context_id)
        # 年度情報を抽出
        if 'Prior' in context_id or 'Current' in context_id:
            for year_key in ['Prior4Year', 'Prior3Year', 'Prior2Year', 'Prior1Year', 'CurrentYear']:
                if year_key in context_id:
                    context_year_map[year_key].add(context_id)
    
    print(f"ユニークなコンテキストID数: {len(context_ids)}")
    print("\n年度別コンテキストID:")
    for year in ['Prior4Year', 'Prior3Year', 'Prior2Year', 'Prior1Year', 'CurrentYear']:
        if year in context_year_map:
            print(f"  {year}: {len(context_year_map[year])} 種類")
            for ctx_id in sorted(list(context_year_map[year]))[:3]:
                print(f"    - {ctx_id}")
            if len(context_year_map[year]) > 3:
                print(f"    ... 他 {len(context_year_map[year]) - 3} 種類")
    
    # 2. 要素IDの分析
    print("\n【2. 要素IDの分析】")
    print("-" * 80)
    element_ids = set()
    element_id_prefixes = defaultdict(int)
    for row in rows:
        element_id = row.get('要素ID', '')
        element_ids.add(element_id)
        # プレフィックスを抽出
        if ':' in element_id:
            prefix = element_id.split(':')[0]
            element_id_prefixes[prefix] += 1
    
    print(f"ユニークな要素ID数: {len(element_ids)}")
    print("\n要素IDプレフィックス別の出現回数（上位10）:")
    for prefix, count in sorted(element_id_prefixes.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"  {prefix}: {count} 回")
    
    # 3. 連結・個別の分析
    print("\n【3. 連結・個別の分析】")
    print("-" * 80)
    consolidation_types = defaultdict(int)
    for row in rows:
        consolidation = row.get('連結・個別', '')
        consolidation_types[consolidation] += 1
    
    for consolidation, count in consolidation_types.items():
        print(f"  {consolidation}: {count} 行")
    
    # 4. 期間・時点の分析
    print("\n【4. 期間・時点の分析】")
    print("-" * 80)
    period_types = defaultdict(int)
    for row in rows:
        period = row.get('期間・時点', '')
        period_types[period] += 1
    
    for period, count in period_types.items():
        print(f"  {period}: {count} 行")
    
    # 5. 単位の分析
    print("\n【5. 単位の分析】")
    print("-" * 80)
    units = defaultdict(int)
    for row in rows:
        unit = row.get('単位', '')
        units[unit] += 1
    
    for unit, count in sorted(units.items(), key=lambda x: x[1], reverse=True):
        print(f"  {unit}: {count} 行")
    
    # 6. サンプルデータの表示
    print("\n【6. サンプルデータ（最初の20行）】")
    print("-" * 80)
    for i, row in enumerate(rows[:20]):
        print(f"\n行 {i+1}:")
        print(f"  要素ID: {row.get('要素ID', '')[:80]}")
        print(f"  項目名: {row.get('項目名', '')}")
        print(f"  コンテキストID: {row.get('コンテキストID', '')}")
        print(f"  相対年度: {row.get('相対年度', '')}")
        print(f"  連結・個別: {row.get('連結・個別', '')}")
        print(f"  期間・時点: {row.get('期間・時点', '')}")
        print(f"  単位: {row.get('単位', '')}")
        print(f"  値: {row.get('値', '')}")
    
    # 7. 年度別データの有無確認
    print("\n【7. 年度別データの有無確認】")
    print("-" * 80)
    years = ['Prior4Year', 'Prior3Year', 'Prior2Year', 'Prior1Year', 'CurrentYear']
    year_data_count = {year: 0 for year in years}
    
    for row in rows:
        context_id = row.get('コンテキストID', '')
        for year in years:
            if year in context_id:
                year_data_count[year] += 1
    
    for year, count in year_data_count.items():
        print(f"  {year}: {count} 行")
    
    # 8. 値のデータ型分析
    print("\n【8. 値のデータ型分析】")
    print("-" * 80)
    value_types = defaultdict(int)
    numeric_count = 0
    text_count = 0
    empty_count = 0
    
    for row in rows:
        value = row.get('値', '')
        if value == '':
            empty_count += 1
        else:
            try:
                float(value)
                numeric_count += 1
            except ValueError:
                text_count += 1
    
    print(f"  数値データ: {numeric_count} 行")
    print(f"  テキストデータ: {text_count} 行")
    print(f"  空データ: {empty_count} 行")
    
    # 9. サンプルデータをJSONで保存
    print("\n【9. サンプルデータの保存】")
    print("-" * 80)
    sample_data = {
        "total_rows": len(rows),
        "columns": list(rows[0].keys()) if rows else [],
        "context_id_types": len(context_ids),
        "element_id_types": len(element_ids),
        "year_data_count": year_data_count,
        "sample_rows": rows[:50],  # 最初の50行をサンプルとして保存
    }
    
    output_file = Path("tsv_structure_analysis.json")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(sample_data, f, ensure_ascii=False, indent=2)
    
    print(f"分析結果を {output_file} に保存しました")
    
    # 10. パース後の構造を推測
    print("\n【10. パース後のデータ構造の推測】")
    print("-" * 80)
    print("""
パース後のデータ構造は以下のようになると推測されます:

1. META (基本情報):
   - 年度情報を持たない単一値の辞書
   - 例: {"会社名": "トヨタ自動車株式会社", "EDINETコード": "E02144", ...}

2. SUMMARY (業績サマリー):
   - 年度情報を持つ辞書の辞書
   - 例: {"売上高": {"Prior1Year": "37154298000000", "CurrentYear": "45095325000000"}, ...}

3. BS/PL/CF (財務諸表):
   - 年度情報を持つ辞書の辞書
   - 例: {"現金及び預金": {"Prior1Year": "2965923000000", "CurrentYear": "4278139000000"}, ...}

4. TEXT (テキスト情報):
   - 年度情報を持つテキストの辞書
   - 例: {"事業の内容": {"CurrentYear": "当社は自動車の製造・販売を..."}, ...}
    """)
    
    print("=" * 80)
    print("分析完了")
    print("=" * 80)


if __name__ == "__main__":
    # edinet-wrapperのルートからの相対パス
    script_dir = Path(__file__).parent
    tsv_file = script_dir.parent / "data" / "E02144" / "S100TR7I.tsv"
    
    if not tsv_file.exists():
        print(f"エラー: TSVファイルが見つかりません: {tsv_file}")
        sys.exit(1)
    
    analyze_tsv_structure(tsv_file)
