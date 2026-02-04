import os
import glob
import random
import polars as pl
from concurrent.futures import ThreadPoolExecutor
from argparse import ArgumentParser
from tqdm import tqdm
import json
from edinet2dataset.parser import Parser, parse_tsv
from loguru import logger
import datasets
from typing import Optional

from datetime import datetime


def is_one_year_shift(previous: datetime, current: datetime) -> bool:
    # Check if the difference is exactly one year apart
    return (
        previous.year + 1 == current.year
        and previous.month == current.month
        and previous.day == current.day
    )


def test_check_one_year_shift():
    # Regular year
    assert is_one_year_shift(datetime(2021, 1, 1), datetime(2022, 1, 1)) == True
    assert is_one_year_shift(datetime(2021, 1, 1), datetime(2022, 1, 2)) == False
    # Leap year
    assert is_one_year_shift(datetime(2020, 2, 29), datetime(2021, 2, 28)) == True
    assert is_one_year_shift(datetime(2020, 2, 29), datetime(2021, 3, 1)) == False


def get_consecutive_2_years(data_dir: str) -> list[dict]:
    json_files = glob.glob(os.path.join(data_dir, "*.json"))
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

    pairs = []
    logger.debug(f"Document ID with period data: {doc_id_with_period}")
    for i in range(len(doc_id_with_period) - 1):
        doc_id_previous = doc_id_with_period[i][0]
        doc_id_current = doc_id_with_period[i + 1][0]
        if not is_one_year_shift(
            datetime.strptime(doc_id_with_period[i][1], "%Y-%m-%d"),
            datetime.strptime(doc_id_with_period[i + 1][1], "%Y-%m-%d"),
        ) or not is_one_year_shift(
            datetime.strptime(doc_id_with_period[i][2], "%Y-%m-%d"),
            datetime.strptime(doc_id_with_period[i + 1][2], "%Y-%m-%d"),
        ):
            continue

        pairs.append(
            {
                "PreviousYearPath": os.path.join(data_dir, f"{doc_id_previous}.tsv"),
                "CurrentYearPath": os.path.join(data_dir, f"{doc_id_current}.tsv"),
            }
        )
    return pairs


def extract_profit(file_path: str, year: str) -> Optional[int]:
    parser = Parser()
    df = pl.read_csv(
        file_path, separator="\t", encoding="utf-16", infer_schema_length=0
    )
    df = parser.unique_element_list(df)
    for element_id in [
        "ProfitLossAttributableToOwnersOfParent",
        "ProfitLossAttributableToOwnersOfParentCompanyIFRS",
    ]:
        df_filtered = parser.filter_by_element_id(df, element_id)
        if df_filtered.shape[0] > 0:
            df = df_filtered
            break
    else:
        logger.error(f"ProfitLoss not found in {file_path}")
        return None

    df = parser.filter_by_year(df, year)
    if df.shape[0] != 1:
        logger.error(f"df shape is not 1 in {file_path}")
        return None

    return int(df["値"].to_numpy()[0])


def is_profit_increase(previous: int, current: int) -> bool:
    return current > previous


def process_single_company(previous_tsv: str, current_tsv: str) -> Optional[dict]:
    prior2year_profit = extract_profit(previous_tsv, "Prior1Year")
    prior1year_profit = extract_profit(previous_tsv, "CurrentYear")
    current_profit = extract_profit(current_tsv, "CurrentYear")
    if None in (prior2year_profit, prior1year_profit, current_profit):
        return None

    previous_financial_data = parse_tsv(previous_tsv)
    if not previous_financial_data:
        logger.warning(f"Failed to parse {previous_tsv}")
        return None
    return {
        "meta": json.dumps(previous_financial_data.meta, ensure_ascii=False),
        "summary": json.dumps(previous_financial_data.summary, ensure_ascii=False),
        "bs": json.dumps(previous_financial_data.bs, ensure_ascii=False),
        "pl": json.dumps(previous_financial_data.pl, ensure_ascii=False),
        "cf": json.dumps(previous_financial_data.cf, ensure_ascii=False),
        "text": json.dumps(previous_financial_data.text, ensure_ascii=False),
        "label": int(is_profit_increase(prior1year_profit, current_profit)),
        "naive_prediction": int(
            is_profit_increase(prior2year_profit, prior1year_profit)
        ),
        "edinet_code": previous_financial_data.meta["EDINETコード"],
        "doc_id": os.path.basename(previous_tsv).split(".")[0],
        "previous_year_file_path": previous_tsv,
        "current_year_file_path": current_tsv,
    }


def balance_class(ds):
    positive = ds.filter(lambda x: x["label"] == 1)
    negative = ds.filter(lambda x: x["label"] == 0)
    min_len = min(len(positive), len(negative))
    return datasets.concatenate_datasets(
        [
            positive.shuffle(seed=42).select(range(min_len)),
            negative.shuffle(seed=42).select(range(min_len)),
        ]
    )


def parse_args():
    parser = ArgumentParser(description="Prepare the dataset for training")
    parser.add_argument("--input_dir", type=str, default="edinet_corpus/annual")
    parser.add_argument("--output_path", type=str, default="dataset/earnings_forecast")
    parser.add_argument("--num_workers", type=int, default=8)
    parser.add_argument("--num_example", type=int, default=1000)
    parser.add_argument("--balance_class", action="store_true")
    return parser.parse_args()


def main():
    args = parse_args()
    random.seed(42)
    edinet_dirs = glob.glob(os.path.join(args.input_dir, "*"))
    random.shuffle(edinet_dirs)

    results = []

    progress_bar = tqdm(total=args.num_example, desc="Valid results collected")

    for dir in edinet_dirs:
        pair_list = get_consecutive_2_years(dir)
        if not pair_list:
            continue

        pair = random.choice(pair_list)
        # check if files exist
        if not os.path.exists(pair["PreviousYearPath"]):
            logger.error(f"File not found: {pair['PreviousYearPath']}")
            continue
        if not os.path.exists(pair["CurrentYearPath"]):
            logger.error(f"File not found: {pair['CurrentYearPath']}")
            continue
        logger.info(f"Sampled pair: {pair}")

        with ThreadPoolExecutor(max_workers=args.num_workers) as executor:
            future = executor.submit(
                process_single_company,
                pair["PreviousYearPath"],
                pair["CurrentYearPath"],
            )
            result = future.result()
            if result:
                results.append(result)
                progress_bar.update(1)

        if len(results) >= args.num_example:
            break

    progress_bar.close()

    ds = datasets.Dataset.from_dict(
        {k: [d.get(k, None) for d in results] for k in next(iter(results), {})}
    )

    def is_train(example):
        meta = json.loads(example["meta"])
        return int(meta["当事業年度開始日"].split("-")[0]) < 2020

    train_ds = ds.filter(is_train)
    test_ds = ds.filter(lambda x: not is_train(x))

    if args.balance_class:
        train_ds = balance_class(train_ds)
        test_ds = balance_class(test_ds)

    logger.info(f"Train dataset size: {len(train_ds)}")
    logger.info(f"Test dataset size: {len(test_ds)}")

    os.makedirs(args.output_path, exist_ok=True)
    train_ds.to_json(os.path.join(args.output_path, "train.json"), force_ascii=False)
    test_ds.to_json(os.path.join(args.output_path, "test.json"), force_ascii=False)


if __name__ == "__main__":
    main()
