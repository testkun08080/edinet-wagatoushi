#!/usr/bin/env python3
"""
実際のデータ構造を示すサンプルデータを作成
"""
import csv
import json
from pathlib import Path
from collections import defaultdict

def create_sample_data_structure():
    """TSVファイルから実際のデータ構造のサンプルを作成"""
    
    # edinet-wrapperのルートからの相対パス
    script_dir = Path(__file__).parent
    tsv_file = script_dir.parent / "data" / "E02144" / "S100TR7I.tsv"
    
    # TSVファイルを読み込み
    rows = []
    with open(str(tsv_file), 'r', encoding='utf-16') as f:
        reader = csv.DictReader(f, delimiter='\t')
        for row in reader:
            rows.append(row)
    
    # 要素IDでグループ化
    element_groups = defaultdict(list)
    for row in rows:
        element_id = row.get('要素ID', '')
        element_groups[element_id].append(row)
    
    # サンプルデータ構造を作成
    sample_structure = {
        "file_info": {
            "file": str(tsv_file),
            "total_rows": len(rows),
            "unique_elements": len(element_groups)
        },
        "raw_tsv_sample": rows[:10],
        "parsed_structure_examples": {}
    }
    
    # 各カテゴリのサンプルを抽出
    categories = {
        "META": ["jpdei_cor:CompanyNameCoverPage", "jpdei_cor:EDINETCodeDEI"],
        "SUMMARY": [
            "jpcrp_cor:NetSalesSummaryOfBusinessResults",
            "jpcrp_cor:OrdinaryIncomeLossSummaryOfBusinessResults",
            "jpcrp_cor:ProfitLossAttributableToOwnersOfParentSummaryOfBusinessResults",
            "jpcrp_cor:TotalAssetsSummaryOfBusinessResults",
            "jpcrp_cor:NetAssetsSummaryOfBusinessResults"
        ],
        "BS": [
            "jpcrp_cor:CashAndDeposits",
            "jpcrp_cor:CashAndCashEquivalents",
            "jpcrp_cor:AccountsReceivableTrade",
            "jpcrp_cor:Inventories",
            "jpcrp_cor:TotalAssets"
        ],
        "PL": [
            "jpcrp_cor:NetSales",
            "jpcrp_cor:CostOfSales",
            "jpcrp_cor:GrossProfit",
            "jpcrp_cor:OperatingProfitLoss",
            "jpcrp_cor:OrdinaryIncome"
        ],
        "CF": [
            "jpcrp_cor:NetCashProvidedByUsedInOperatingActivities",
            "jpcrp_cor:NetCashProvidedByUsedInInvestingActivities",
            "jpcrp_cor:NetCashProvidedByUsedInFinancingActivities"
        ]
    }
    
    for category, element_ids in categories.items():
        sample_structure["parsed_structure_examples"][category] = {}
        
        for element_id in element_ids:
            # 完全一致または部分一致で検索
            matching_rows = []
            for eid, group_rows in element_groups.items():
                if element_id in eid or eid.endswith(f":{element_id.split(':')[-1]}"):
                    matching_rows.extend(group_rows)
            
            if matching_rows:
                # 年度別に整理
                year_data = defaultdict(dict)
                for row in matching_rows:
                    context_id = row.get('コンテキストID', '')
                    value = row.get('値', '')
                    
                    # 年度を判定
                    year = None
                    if 'CurrentYear' in context_id:
                        year = 'CurrentYear'
                    elif 'Prior1Year' in context_id:
                        year = 'Prior1Year'
                    elif 'Prior2Year' in context_id:
                        year = 'Prior2Year'
                    elif 'Prior3Year' in context_id:
                        year = 'Prior3Year'
                    elif 'Prior4Year' in context_id:
                        year = 'Prior4Year'
                    
                    if year:
                        # 項目名を取得
                        item_name = row.get('項目名', '')
                        if not item_name:
                            # 要素IDから推測
                            item_name = element_id.split(':')[-1]
                        
                        year_data[year] = {
                            "value": value,
                            "unit": row.get('単位', ''),
                            "context_id": context_id,
                            "period_type": row.get('期間・時点', '')
                        }
                
                if year_data:
                    sample_structure["parsed_structure_examples"][category][element_id] = {
                        "item_name": matching_rows[0].get('項目名', ''),
                        "year_data": dict(year_data)
                    }
    
    # JSONで保存
    script_dir = Path(__file__).parent
    output_file = script_dir.parent / "sample_data_structure.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(sample_structure, f, ensure_ascii=False, indent=2)
    
    print(f"サンプルデータ構造を {output_file} に保存しました")
    
    # 読みやすい形式で表示
    print("\n" + "=" * 80)
    print("パース後のデータ構造サンプル")
    print("=" * 80)
    
    for category, examples in sample_structure["parsed_structure_examples"].items():
        print(f"\n【{category}】")
        print("-" * 80)
        for element_id, data in list(examples.items())[:3]:  # 最初の3つだけ表示
            print(f"\n要素ID: {element_id}")
            print(f"項目名: {data['item_name']}")
            print("年度別データ:")
            for year, year_info in data['year_data'].items():
                print(f"  {year}: {year_info['value']} {year_info['unit']} ({year_info['period_type']})")
    
    return sample_structure

if __name__ == "__main__":
    create_sample_data_structure()
