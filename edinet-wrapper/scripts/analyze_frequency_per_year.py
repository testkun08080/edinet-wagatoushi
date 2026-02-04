import os
import polars as pl
import glob
from edinet2dataset.parser import Parser
from collections import Counter
import matplotlib_fontja  # noqa
from tqdm import tqdm
from matplotlib import pyplot as plt

dir = "edinet_corpus/annual"
edinet_codes = os.listdir(dir)
tsv_files = glob.glob(os.path.join(dir, "*", "*.tsv"))
print(f"Number of tsv files: {len(tsv_files)}")
parser = Parser()


def get_current_fiscal_year_start_date(tsv_file, parser):
    df = pl.read_csv(tsv_file, separator="\t", encoding="utf-16", infer_schema_length=0)

    start_year = (
        parser.filter_by_element_id(df, "CurrentFiscalYearStartDateDEI")
        .select("値")
        .to_dict()["値"][0]
        .split("-")[0]
    )
    return int(start_year)


print(get_current_fiscal_year_start_date(tsv_files[0], parser))

year_count = Counter()
for tsv_file in tqdm(tsv_files):
    year = get_current_fiscal_year_start_date(tsv_file, parser)
    year_count[year] += 1
    if year in [2009, 2010, 2011, 2012, 2013]:
        print(tsv_file)


year_count = dict(sorted(year_count.items()))

print(year_count)

plt.figure(figsize=(10, 6))
plt.bar(year_count.keys(), year_count.values())
plt.xlabel("Year")
plt.ylabel("Count")
plt.title("Number of Files per Year")
plt.xticks(list(year_count.keys()), rotation=45)
plt.grid(axis="y")
plt.tight_layout()
plt.savefig("year_distribution.png")
plt.show()
