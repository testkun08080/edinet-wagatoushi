import polars as pl
import argparse
from edinet_wrapper.element_id_table import BS, PL, CF, SUMMARY, META, TEXT
from dataclasses import dataclass
from loguru import logger


@dataclass
class FinancialData:
    meta: dict
    summary: dict
    text: dict
    bs: dict
    pl: dict
    cf: dict


YEAR_LIST = [
    "Prior4Year",
    "Prior3Year",
    "Prior2Year",
    "Prior1Year",
    "CurrentYear",
    "Prior1YTD",
    "CurrentYTD",
    "Prior1Quarter",
    "CurrentQuarter",
    # 中間期（IFRS 半期報告書の InterimDuration / Prior1InterimDuration 用）
    "Prior1Interim",
    "Interim",
    "FilingDate",
]


class Parser:
    @staticmethod
    def filter_by_year(df, year: str) -> pl.DataFrame:
        """Filter elements by year"""
        return df.filter(
            (pl.col("コンテキストID") == f"{year}Instant")
            | (pl.col("コンテキストID") == f"{year}Instant_NonConsolidatedMember")
            | (pl.col("コンテキストID") == f"{year}Duration")
            | (pl.col("コンテキストID") == f"{year}Duration_NonConsolidatedMember")
        )

    @staticmethod
    def filter_by_element_id(df, element_id: str) -> pl.DataFrame:
        """Filter elements by element_id"""
        return df.filter(
            pl.col("要素ID").str.ends_with(f":{element_id}") | pl.col("要素ID").str.ends_with(f":{element_id}IFRS")
        )

    @staticmethod
    def filter_by_consolidation(df) -> pl.DataFrame:
        """Filter elements by consolidation"""
        filtered_df = df.filter(~pl.col("連結・個別").str.contains("個別"))
        return filtered_df.filter(~pl.col("コンテキストID").str.contains("NonConsolidatedMember$"))

    @staticmethod
    def unique_element_list(df) -> pl.DataFrame:
        """Return unique elements"""
        return df.unique(subset=["要素ID", "コンテキストID", "相対年度", "連結・個別", "期間・時点"])

    def to_dict(self, df, value: str, contain_year: bool = True) -> dict:
        years = YEAR_LIST
        # Initialize the results dictionary
        results = {}
        # Iterate through the years
        for year in years:
            filtered_df = self.filter_by_year(df, year)
            if filtered_df.height == 1:
                if contain_year:
                    # If contain_year is True, use year as the key
                    if value not in results:
                        results[value] = {}
                    results[value][year] = filtered_df["値"][0]
                else:
                    # If contain_year is False, just store the value
                    results[value] = filtered_df["値"][0]

        # Remove the value entry from the results if no data was found
        if value in results and not results[value]:
            del results[value]

        return results


# extract leaf elements from sheet
def extract_leaf_elements(sheet: dict) -> list:
    """Extract leaf elements from a sheet."""
    elements = []

    for key, value in sheet.items():
        if isinstance(value, dict):
            elements.extend(extract_leaf_elements(value))
        else:
            elements.append({key: value})

    return elements


def parse_tsv(
    file_path,
) -> FinancialData | None:
    """
    Parse the TSV file and return a FinancialData object.
    Current implementation supports only consolidated reports.
    """

    parser = Parser()
    df = pl.read_csv(file_path, separator="\t", encoding="utf-16", infer_schema_length=0)
    df = parser.unique_element_list(df)
    logger.info(f"Found {df.shape[0]} unique elements in {file_path}")

    financial_data = {}  # JSONデータのベース

    sheet_name_map = {
        "META": META,
        "SUMMARY": SUMMARY,
        "TEXT": TEXT,
        "BS": BS,
        "PL": PL,
        "CF": CF,
    }
    for sheet_name, sheet in sheet_name_map.items():
        if sheet_name == "META":
            contain_year = False
        else:
            contain_year = True
        sheet_data = {}  # シートごとのデータを格納

        elements = extract_leaf_elements(sheet)

        for element in elements:
            key, value = list(element.items())[0]
            filtered_df = parser.filter_by_element_id(df, key)
            filtered_df = parser.filter_by_consolidation(filtered_df)
            result = parser.to_dict(filtered_df, value, contain_year)
            sheet_data.update(result)

        financial_data[sheet_name] = sheet_data  # JSONデータに追加
    if financial_data["META"].get("連結決算の有無") == "false":
        return None
    financial_data = FinancialData(
        meta=financial_data["META"],
        summary=financial_data["SUMMARY"],
        text=financial_data["TEXT"],
        bs=financial_data["BS"],
        pl=financial_data["PL"],
        cf=financial_data["CF"],
    )
    return financial_data


def parse_args():
    parser = argparse.ArgumentParser("Parse annual report TSV file")
    parser.add_argument("--file_path", type=str, default="data/E02144/S100TR7I.tsv")
    parser.add_argument(
        "--category_list",
        type=str,
        nargs="+",
        help="Category to parse",
        choices=[
            "META",
            "SUMMARY",
            "BS",
            "PL",
            "CF",
            "TEXT",
        ],
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()

    financial_data = parse_tsv(args.file_path)
    for category in args.category_list:
        if category == "META":
            print(financial_data.meta)
        elif category == "SUMMARY":
            print(financial_data.summary)
        elif category == "BS":
            print(financial_data.bs)
        elif category == "PL":
            print(financial_data.pl)
        elif category == "CF":
            print(financial_data.cf)
        elif category == "TEXT":
            print(financial_data.text)
