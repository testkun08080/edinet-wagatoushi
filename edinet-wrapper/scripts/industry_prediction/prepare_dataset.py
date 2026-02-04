import os
import glob
import random
import polars as pl
from concurrent.futures import ThreadPoolExecutor
from argparse import ArgumentParser
from tqdm import tqdm
import json
from pathlib import Path
from edinet2dataset.parser import parse_tsv
from loguru import logger
import datasets
from typing import Optional
from edinet2dataset.downloader import Downloader

# mapping from 33 industry label to 16 industry label
industry_mapping = {
    "水産・農林業": "食品",
    "食料品": "食品",
    "鉱業": "電気・ガス・エネルギー資源",
    "石油・石炭製品": "電気・ガス・エネルギー資源",
    "建設業": "建設・資材",
    "金属製品": "建設・資材",
    "ガラス・土石製品": "建設・資材",
    "繊維製品": "素材・化学",
    "パルプ・紙": "素材・化学",
    "化学": "素材・化学",
    "医薬品": "医薬品",
    "ゴム製品": "自動車・輸送機",
    "輸送用機器": "自動車・輸送機",
    "鉄鋼": "鉄鋼・非鉄",
    "非鉄金属": "鉄鋼・非鉄",
    "機械": "機械",
    "電気機器": "電機・精密",
    "精密機器": "電機・精密",
    "その他製品": "情報通信・サービスその他",
    "情報・通信業": "情報通信・サービスその他",
    "サービス業": "情報通信・サービスその他",
    "電気・ガス業": "電気・ガス・エネルギー資源",
    "陸運業": "運輸・物流",
    "海運業": "運輸・物流",
    "空運業": "運輸・物流",
    "倉庫・運輸関連": "運輸・物流",
    "卸売業": "商社・卸売",
    "小売業": "小売",
    "銀行業": "銀行",
    "証券、商品先物取引業": "金融(除く銀行)",
    "保険業": "金融(除く銀行)",
    "その他金融業": "金融(除く銀行)",
    "不動産業": "不動産",
}


def process_single_company(
    current_tsv: str, edinet_code_info: pl.DataFrame
) -> Optional[dict]:
    edinet_code = current_tsv.split("/")[2]
    industry = edinet_code_info.filter(pl.col("ＥＤＩＮＥＴコード") == edinet_code)[
        "提出者業種"
    ].to_numpy()[0]

    industry = industry_mapping.get(industry, "invalid")  # 16 industry label

    try:
        previous_financial_data = parse_tsv(current_tsv)
        if not previous_financial_data:
            logger.warning(f"Failed to parse {current_tsv}")
            return None
    except Exception as e:
        logger.warning(f"Failed to parse {current_tsv}: {e}")
        return None

    return {
        "meta": json.dumps(previous_financial_data.meta, ensure_ascii=False),
        "summary": json.dumps(previous_financial_data.summary, ensure_ascii=False),
        "bs": json.dumps(previous_financial_data.bs, ensure_ascii=False),
        "pl": json.dumps(previous_financial_data.pl, ensure_ascii=False),
        "cf": json.dumps(previous_financial_data.cf, ensure_ascii=False),
        "text": json.dumps(previous_financial_data.text, ensure_ascii=False),
        "industry": industry,
        "edinet_code": previous_financial_data.meta["EDINETコード"],
        "doc_id": os.path.basename(current_tsv).split(".")[0],
        "file_path": current_tsv,
    }


def parse_args():
    parser = ArgumentParser(description="Prepare the dataset for training")
    parser.add_argument("--input_dir", type=str, default="edinet_corpus/annual")
    parser.add_argument(
        "--output_path", type=str, default="dataset/industry_prediction"
    )
    parser.add_argument("--num_workers", type=int, default=8)
    return parser.parse_args()


def main():
    args = parse_args()
    random.seed(42)

    # Load securities codes to exclude
    # edinet-wrapperのルートからの相対パス
    script_dir = Path(__file__).parent.parent
    industry_revision_file = script_dir.parent / "data" / "industry_revision.txt"
    with open(str(industry_revision_file), "r") as f:
        excluded_securities_codes = set(line.strip() for line in f)

    edinet_dirs = glob.glob(os.path.join(args.input_dir, "*"))
    downloader = Downloader()
    edinet_code_info = downloader.edinet_code_info

    # Step 1: Build industry -> [tsv_paths] mapping
    industry_to_tsvs = {}
    for dir in edinet_dirs:
        tsv_files = glob.glob(os.path.join(dir, "*.tsv"))
        if not tsv_files:
            logger.warning(f"No TSV files found in {dir}")
            continue
        json_files = glob.glob(os.path.join(dir, "*.json"))
        doc_id_to_json = {
            json.load(open(json_file, encoding="utf-8"))["docID"]: json.load(
                open(json_file, encoding="utf-8")
            )
            for json_file in json_files
        }
        doc_id_with_period = [
            (doc_id, data["periodStart"], data["periodEnd"])
            for doc_id, data in doc_id_to_json.items()
        ]
        doc_id_with_period.sort(key=lambda x: x[1])
        # get latest doc_id
        latest_doc_id = doc_id_with_period[-1][0]
        tsv_file = os.path.join(dir, latest_doc_id + ".tsv")
        edinet_code = tsv_file.split("/")[2]
        try:
            company_info = edinet_code_info.filter(
                pl.col("ＥＤＩＮＥＴコード") == edinet_code
            )
            if company_info.height == 0:  # No matching company found
                logger.warning(f"Company not found in EDINET info: {edinet_code}")
                continue

            industry = company_info["提出者業種"].to_numpy()[0]
            if industry == "内国法人・組合（有価証券報告書等の提出義務者以外）":
                logger.info(f"Skipping company with industry: {industry}")
                continue

            industry = industry_mapping.get(industry, "invalid")  # 16 industry label

            ticker_code = company_info["証券コード"].to_numpy()[0]
            if not ticker_code:
                logger.warning(f"No ticker code for company: {edinet_code}")
                continue

            ticker_code = str(ticker_code)[:-1]
            if ticker_code in excluded_securities_codes:
                logger.info(
                    f"Skipping excluded company with ticker code: {ticker_code}"
                )
                continue
        except Exception as e:
            logger.warning(f"Error processing {edinet_code}: {e}")
            continue

        industry_to_tsvs.setdefault(industry, []).append(tsv_file)

    # Step 2: Sample 35 tsvs per industry
    sampled_tsvs = []
    for industry, tsvs in industry_to_tsvs.items():
        sampled = random.sample(tsvs, min(35, len(tsvs)))
        sampled_tsvs.extend(sampled)

    # Step 3: Process in parallel
    results = []
    with ThreadPoolExecutor(max_workers=args.num_workers) as executor:
        futures = [
            executor.submit(process_single_company, tsv_file, edinet_code_info)
            for tsv_file in sampled_tsvs
        ]
        for future in tqdm(futures):
            result = future.result()
            if result:
                results.append(result)

    # Step 4: Save dataset
    if results:
        ds = datasets.Dataset.from_dict(
            {k: [d.get(k, None) for d in results] for k in next(iter(results), {})}
        )
        os.makedirs(args.output_path, exist_ok=True)
        ds.to_json(os.path.join(args.output_path, "train.json"), force_ascii=False)
    else:
        logger.warning("No data processed successfully!")


if __name__ == "__main__":
    main()
