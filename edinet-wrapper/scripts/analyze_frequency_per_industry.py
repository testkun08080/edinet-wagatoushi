from edinet2dataset.downloader import Downloader
from matplotlib import pyplot as plt
import polars as pl
import os
import matplotlib_fontja  # noqa

pl.Config.set_tbl_rows(100)

plt.rcParams["font.size"] = 30 

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

label_en_map = {
    "食品": "Food",
    "電気・ガス・エネルギー資源": "Energy",
    "建設・資材": "Construction",
    "素材・化学": "Materials",
    "医薬品": "Pharma",
    "自動車・輸送機": "Auto",
    "鉄鋼・非鉄": "Steel/Metal",
    "機械": "Machinery",
    "電機・精密": "Electronics",
    "情報通信・サービスその他": "IT & Services",
    "運輸・物流": "Logistics",
    "商社・卸売": "Trading",
    "小売": "Retail",
    "銀行": "Banks",
    "金融(除く銀行)": "Finance",
    "不動産": "Real Estate",
}

downloader = Downloader()

df = downloader.edinet_code_info
# ['ＥＤＩＮＥＴコード', '提出者種別', '上場区分', '連結の有無', '資本金', '決算日', '提出者名', '提出者名（英字）', '提出者名（ヨミ）', '所在地', '提出者業種', '証券コード', '提出者法人番号']


dir = "edinet_corpus/annual"
edinet_codes = os.listdir(dir)

df = df.filter(pl.col("ＥＤＩＮＥＴコード").is_in(edinet_codes))
print(df.head(3))

print(f"Number of edinet codes: {len(df)}")

print(df["上場区分"].value_counts())

print(df["連結の有無"].value_counts())

print(df["提出者種別"].value_counts())

print(df["提出者業種"].value_counts())

df = df.with_columns(
    pl.col("提出者業種").replace(industry_mapping, default="その他").alias("業種分類")
)
df = df.filter(pl.col("業種分類") != "その他")

print(df)

df = df.with_columns(
    pl.col("業種分類").replace(label_en_map, default="その他").alias("industry_en")
)

industry_counts = df["industry_en"].value_counts()
industry_counts.columns = ["業種", "件数"]

industry_counts = industry_counts.sort("件数")

print(f"Total industry's company: {df.filter(pl.col('業種分類') != 'その他').shape[0]}")

plt.figure(figsize=(12, 10))  
bars = plt.barh(industry_counts["業種"], industry_counts["件数"])
plt.xlim(0, industry_counts["件数"].max() * 1.2)

for i, bar in enumerate(bars):
    plt.text(
        bar.get_width() + 1,
        bar.get_y() + bar.get_height() / 2,
        str(industry_counts["件数"][i]),
        va="center",
    )

plt.xlabel("Count")
plt.ylabel("Industry")
plt.tight_layout(pad=1.5) 
plt.savefig(
    "scripts/industry_distribution.png", bbox_inches="tight"
)  
plt.show()
