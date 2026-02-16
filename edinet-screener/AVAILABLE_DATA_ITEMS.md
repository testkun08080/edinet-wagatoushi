# サンプル企業データで利用可能な項目一覧

`summaries/{secCode}.json` の各 `period` に含まれる `summary`, `pl`, `bs`, `cf` から取得できる項目をまとめています。  
現在 `company_metrics.json` に含まれているのは一部のみです。

---

## 1. 現在 company_metrics に含まれている項目

| 項目 | ソース | 備考 |
|------|--------|------|
| 計算日 | periodEnd | ○ |
| 自己資本比率 | summary | ○ 0～1の比率 |
| EPS | summary「１株当たり当期純利益又は当期純損失」 | ○ |
| 売上高 | summary | △ 金融業は null のことがある |
| 経常利益 | summary | ○ |
| 純資産額 | summary | ○ |
| PER | - | × 株価連携で将来的に算出 |
| PBR | - | × 株価連携で将来的に算出 |
| 配当利回り | - | × 株価連携で将来的に算出 |

---

## 2. summary から追加できる項目

| 項目名（element_id 対応） | 日本語名 | 備考 |
|-------------------------|---------|------|
| NetSalesSummaryOfBusinessResults | 売上高 | 既に利用中 |
| OrdinaryIncomeLossSummaryOfBusinessResults | 経常利益 | 既に利用中 |
| ProfitLossAttributableToOwnersOfParentSummaryOfBusinessResults | 親会社株主に帰属する当期純利益 | 純利益 |
| ComprehensiveIncomeSummaryOfBusinessResults | 包括利益 | ○ |
| NetAssetsSummaryOfBusinessResults | 純資産額 | 既に利用中 |
| TotalAssetsSummaryOfBusinessResults | 総資産額 | ○ |
| NetAssetsPerShareSummaryOfBusinessResults | **１株当たり純資産額（BPS）** | PBR算出用 |
| BasicEarningsLossPerShareSummaryOfBusinessResults | １株当たり当期純利益又は当期純損失（EPS） | 既に利用中 |
| DilutedEarningsPerShareSummaryOfBusinessResults | 潜在株式調整後１株当たり当期純利益 | △ 多くの会社で「－」 |
| EquityToAssetRatioSummaryOfBusinessResults | 自己資本比率 | 既に利用中 |
| RateOfReturnOnEquitySummaryOfBusinessResults | **自己資本利益率（ROE）** | ○ |
| PriceEarningsRatioSummaryOfBusinessResults | 株価収益率（PER） | △ 四半期報告書に含まれることがある |
| NetCashProvidedByUsedInOperatingActivitiesSummaryOfBusinessResults | 営業活動によるキャッシュ・フロー | ○ |
| NetCashProvidedByUsedInInvestingActivitiesSummaryOfBusinessResults | 投資活動によるキャッシュ・フロー | ○ |
| NetCashProvidedByUsedInFinancingActivitiesSummaryOfBusinessResults | 財務活動によるキャッシュ・フロー | ○ |
| CashAndCashEquivalentsSummaryOfBusinessResults | 現金及び現金同等物の残高 | ○ |
| PayoutRatioSummaryOfBusinessResults | **配当性向** | ○ |
| DividendPaidPerShareSummaryOfBusinessResults | １株当たり配当額 | 配当利回り算出の材料 |
| TotalNumberOfIssuedSharesSummaryOfBusinessResults | **発行済株式総数** | BPS・時価総額算出用 |
| CapitalStockSummaryOfBusinessResults | 資本金 | ○ |
| NumberOfEmployees | 従業員数 | △ テキストブロック由来で欠損が多い |

---

## 3. pl（損益計算書）から追加できる項目

| 項目名 | 日本語名 | 算出可能な指標 |
|--------|---------|----------------|
| 売上高 | 売上高 | - |
| 売上原価 | 売上原価 | - |
| 売上総利益又は売上総損失（△) | 売上総利益 | - |
| 販売費及び一般管理費 | 販管費 | - |
| 営業利益 | 営業利益 | **営業利益率** = 営業利益/売上高 |
| 経常利益 | 経常利益 | **経常利益率** = 経常利益/売上高 |
| 税引前利益 | 税引前利益 | - |
| 法人所得税費用 | 法人税等 | - |
| 親会社株主に帰属する当期純利益 | 当期純利益 | **純利益率** = 当期純利益/売上高 |

---

## 4. bs（貸借対照表）から追加できる項目

| 項目名 | 日本語名 | 算出可能な指標 |
|--------|---------|----------------|
| 現金及び現金同等物 | 現金等 | ネットキャッシュ等 |
| 流動資産 | 流動資産 | 流動比率 = 流動資産/流動負債 |
| 流動負債 | 流動負債 | - |
| 負債 | 負債 | 負債比率 |
| 総資産 | 総資産 | - |
| 純資産 | 純資産 | - |
| 株主資本 | 株主資本 | - |
| 資本金 | 資本金 | - |
| 短期借入金 | 短期借入金 | - |

---

## 5. cf（キャッシュフロー）から追加できる項目

| 項目名 | 日本語名 |
|--------|---------|
| 営業キャッシュフロー | 営業CF |
| 投資キャッシュフロー | 投資CF |
| 財務キャッシュフロー | 財務CF |
| 配当金の支払額 | 配当金支払額 |
| 現金及び現金同等物 | 期末現金残高 |

---

## 6. 追加実装を推奨する項目（テーブル・フィルター用）

### 優先度高
| 項目 | ソース | 用途 |
|------|--------|------|
| 営業利益 | pl | 営業利益率・営業利益率フィルター |
| 営業利益率(%) | 営業利益/売上高 | 収益性フィルター |
| 純利益率(%) | 当期純利益/売上高 | 収益性フィルター |
| ROE(%) | summary「自己資本利益率、経営指標等」 | 収益性 |
| 総資産額 | summary | 規模 |
| 流動資産 | bs | 流動性 |
| 流動負債 | bs | 流動性 |
| 営業CF | summary / cf | キャッシュ |
| 現金及び現金同等物の残高 | summary | キャッシュ |

### 優先度中
| 項目 | ソース | 用途 |
|------|--------|------|
| BPS（１株当たり純資産額） | summary | 株価連携時にPBR算出 |
| 発行済株式総数 | summary | BPS・時価総額算出 |
| 配当性向(%) | summary | 配当 |
| 配当金の支払額 | cf | 配当 |
| 経常利益率(%) | 経常利益/売上高 | 収益性 |

### 優先度低
| 項目 | ソース | 備考 |
|------|--------|------|
| 従業員数 | summary | 欠損多い |
| 投資CF | summary | - |
| 財務CF | summary | - |
| 負債 | bs | - |

---

## 7. データの取り方（prepare スクリプト）

`prepare_sample_companies.py` の `metrics_entry` で、`latest.get("summary", {})` だけでなく  
`latest.get("pl", {})`, `latest.get("bs", {})`, `latest.get("cf", {})` からも項目を追加できます。

例:
```python
s = latest.get("summary", {})
pl = latest.get("pl", {})
bs = latest.get("bs", {})
cf = latest.get("cf", {})

# 営業利益
operating_profit = pl.get("営業利益")

# 営業利益率（売上高が0でない場合）
sales = s.get("売上高")
operating_profit_ratio = (float(operating_profit) / float(sales) * 100) if sales and operating_profit else None

# 流動資産・流動負債
current_assets = bs.get("流動資産")
current_liabilities = bs.get("流動負債")
```

※ 金融業などで `売上高` が null の企業があります。除算時は null チェックが必要です。

---

## 8. TSV に存在するが element_id_table で未抽出の項目

パーサーは `element_id_table` に定義された要素のみを抽出します。TSV には **208 種類**の要素IDがありますが、多くは未マッピングです。

### 8.1 メタ情報（jpdei_cor）— テーブル・フィルターで使える

| 要素ID | 項目名（TSV 項目名列） | 例 | 備考 |
|--------|------------------------|-----|------|
| NameOfFinancialInstrumentsExchangeOnWhichSecuritiesAreListedOrAuthorized... | 上場金融商品取引所名又は登録認可... | 東京証券取引所市場第一部 | **上場市場**（マザーズ等の判別に利用可能） |
| IndustryCodeWhenConsolidatedFinancialStatementsArePreparedInAccordanceWithIndustrySpecificRegulationsDEI | 別記事業（連結）、DEI | CTE | **業種コード**（CTE=種苗等） |
| FilerNameInJapaneseDEI | 提出者名（日本語表記）、DEI | カネコ種苗株式会社 | JSON メタにもあり |
| SecurityCodeDEI | 証券コード、DEI | 13760 | JSON メタにもあり |
| EDINETCodeDEI | EDINETコード、DEI | E00004 | JSON メタにもあり |
| AccountingStandardsDEI | 会計基準、DEI | Japan GAAP | - |
| TypeOfCurrentPeriodDEI | 当会計期間の種類、DEI | Q2 | 四半期の識別 |

### 8.2 セグメント情報（jpcrp_cor）

| 要素ID | 項目名 | 備考 |
|--------|--------|------|
| RevenuesFromExternalCustomers | 外部顧客への売上高 | **セグメント別売上**（種苗、花卉、農薬、農機材等） |
| TransactionsWithOtherSegments | 他セグメントとの取引 | セグメント間取引 |

### 8.3 大株主情報（jpcrp_cor）

| 要素ID | 項目名 | 備考 |
|--------|--------|------|
| NumberOfSharesHeld | 所有株式数 | No1〜No10 大株主の株式数 |
| ShareholdingRatio | 発行済株式総数に対する所有株式数の割合 | 大株主の持株比率 |
| NameMajorShareholders | 大株主の氏名又は名称 | テキスト（※住所とセットで別行） |
| AddressMajorShareholders | 住所、大株主の状況 | テキスト |

### 8.4 販管費・人件費内訳（jppfs_cor）

| 要素ID | 項目名 | 備考 |
|--------|--------|------|
| EmployeesSalariesAndAllowancesSGA | 給与及び手当、販管費 | 人件費 |
| EmployeesBonusesSGA | 賞与、販管費 | - |
| RetirementBenefitExpensesSGA | 退職給付費用、販管費 | - |
| ProvisionForDirectorsRetirementBenefitsSGA | 役員退職慰労引当金、販管費 | - |
| ProvisionForShareBasedRemunerationForDirectorsAndOtherOfficersSGA | 役員報酬等、販管費 | - |

### 8.5 その他 jppfs_cor の細目

- HouseRentIncomeNOI（家賃収入等、営業外収益）
- ForeignExchangeLossesNOE（為替差損、営業外費用）
- LossOnDisposalOfNoncurrentAssetsEL（固定資産除却損等）
- RemeasurementsOfDefinedBenefitPlans（退職給付リメジャーメント）
- SubtotalOpeCF, OtherNetOpeCFSubtotal 等

### 8.6 抽出するには

`element_id_table.py` の META, SUMMARY, PL, BS, CF に上記の要素IDを追加し、パーサーを再実行すれば、`summaries/*.json` および `company_metrics` に取り込めます。

**優先して追加すると有用なもの：**
- **上場市場**（フィルター・表示用）
- **業種コード**（業種フィルター用）
- **セグメント別売上**（セグメント分析用）
- **人件費内訳**（収益性分析の補助）
