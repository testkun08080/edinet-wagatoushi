# フロント表示パラメーターと EDINET データのマッピング

`build_screener_data.py` → `company_metrics.json` / `summaries/{secCode}.json` → フロント（`CompanyTable` / `SummaryCharts`）の全体的なデータフローを整理したドキュメントです。

---

## データフロー概要

```
EDINET TSV
  └─ parse_tsv()                   ← edinet_wrapper/parser.py
       ├─ fd.summary (開示サマリー)
       ├─ fd.pl     (損益計算書)
       ├─ fd.bs     (貸借対照表)
       └─ fd.cf     (キャッシュフロー計算書)
           │
           └─ _flatten_for_period() → periods[] に格納
                                        ↓
                               summaries/{secCode}.json  ← 企業詳細ページ（SummaryCharts）で使用
                                        ↓
                            summary_to_metrics_row()
                                        ↓
                               company_metrics.json      ← スクリーナーテーブル（CompanyTable）で使用
```

---

## 1. スクリーナーテーブル（`company_metrics.json`）のマッピング

`summary_to_metrics_row()` が `periods[-1]`（最新期）から生成する1行。

### 補完ロジック

最新期の `summary` に値がないキーについて、新しい期から遡って補完する（`_merge_edinet_valuation_from_older_periods`）。対象キー：

- `株価収益率`（PER）
- `自己資本利益率、経営指標等`（ROE）
- `１株当たり純資産額`（BPS）
- `配当性向`
- `１株当たり配当額`（DPS）
- `１株当たり中間配当額`

---

### 1-1. 基本情報


| フロント列ID       | 表示ラベル     | メトリクスキー      | EDINETソース                   | 備考                              |
| ------------- | --------- | ------------ | --------------------------- | ------------------------------- |
| `filerName`   | 会社名       | `filerName`  | `meta.filerName`（jsonメタ）    | 「株式会社」前後を除去して表示                 |
| `secCode`     | 銘柄コード     | `secCode`    | `meta.secCode`（先頭0を除去）      | EDINET形式は5桁（例: 94240）→ 表示は4桁相当に |
| `edinetCode`  | EDINETコード | `edinetCode` | `meta.edinetCode`           | E+5桁形式                          |
| `calcDate`    | 計算日       | `計算日`        | `latest.periodEnd`（最新期の期末日） | 実際は「最新決算期末」を指す                  |
| `fiscalMonth` | 決算月       | `決算月`        | `periodEnd.split("-")[1]`   | 期末日のMM部分                        |


---

### 1-2. バリュエーション指標


| フロント列ID                 | 表示ラベル      | メトリクスキー                 | EDINETソース                                               | 算出方法                                           | 現状                  |
| ----------------------- | ---------- | ----------------------- | ------------------------------------------------------- | ---------------------------------------------- | ------------------- |
| `PER`                   | PER        | `PER`                   | `summary["株価収益率"]`（補完あり）                                | 開示値をそのまま数値化                                    | 補完込みで取得可能           |
| `PBR`                   | PBR        | `PBR`                   | —                                                       | **未実装**（株価が必要）                                 | 常に `null`           |
| `payoutRatio`           | 配当性向       | `配当性向`                  | `summary["配当性向"]`（補完あり）                                 | 開示値をそのまま                                       | 補完込みで取得可能           |
| `payoutRatioComputed`   | 配当性向（算出）   | `payoutRatioComputed`   | DPS ÷ EPS                                               | `_compute_payout_ratio_dps_eps()` / > 200% は除外 | 開示DPS・EPSが揃えば算出     |
| `dividendYield`         | 配当利回り      | `配当利回り`                 | DPS ÷ (EPS × PER) × 100                                 | `_compute_dividend_yield_pct()` / > 10% は除外    | 開示PER・EPS・DPSが揃えば算出 |
| `marketCap`             | 時価総額       | `時価総額`                  | —                                                       | **未実装**（株価が必要）                                 | 常に `null`           |
| `netCash`               | ネットキャッシュ   | `ネットキャッシュ`              | `bs["流動資産"] + bs["投資有価証券"] × 0.7 - bs["負債"]`            | `_net_cash()`                                  | BS値があれば算出（時価不要）     |
| `netCashRatio`          | ネットキャッシュ比率 | `ネットキャッシュ比率`            | —                                                       | **未実装**（時価総額が必要）                               | 常に `null`           |
| `EPS`                   | EPS        | `EPS`                   | `summary["１株当たり当期純利益又は当期純損失"]`                          | 開示値そのまま                                        | —                   |
| `dilutedEPS`            | 希薄化EPS     | `dilutedEPS`            | `summary["潜在株式調整後１株当たり当期純利益"]`                          | 開示値そのまま                                        | —                   |
| `ROE`                   | ROE        | `ROE`                   | `summary["自己資本利益率、経営指標等"]`（補完あり）                        | 開示値（0.1996 形式の小数）                              | 補完込みで取得可能           |
| `roeCalculated`         | ROE（算出）    | `roeCalculated`         | 当期純利益 ÷ 純資産額                                            | `_compute_roe_calculated()`                    | 両値があれば算出            |
| `roa`                   | ROA        | `roa`                   | 当期純利益 ÷ 総資産額                                            | `_compute_roa()`                               | 両値があれば算出            |
| `equityRatio`           | 自己資本比率     | `自己資本比率`                | `summary["自己資本比率"]`                                     | 開示値（小数形式）※補完対象外                                | —                   |
| `equityRatioCalculated` | 自己資本比率（算出） | `equityRatioCalculated` | 純資産額 ÷ 総資産額                                             | `_compute_equity_ratio_calculated()`           | 両値があれば算出            |
| `BPS`                   | BPS        | `BPS`                   | `summary["１株当たり純資産額"]`（補完あり）                            | 開示値そのまま                                        | 補完込みで取得可能           |
| `dividendPerShare`      | 1株当たり配当金   | `dividendPerShare`      | `summary["１株当たり配当額"]` または `summary["１株当たり中間配当額"]`（補完あり） | 開示値そのまま                                        | —                   |
| `sharesOutstanding`     | 発行済株式総数    | `発行済株式総数`               | `summary["発行済株式総数（普通株式）"]`                              | 開示値そのまま                                        | 四半等では欠けやすい          |


---

### 1-3. 業績（PL系）


| フロント列ID                | 表示ラベル | メトリクスキー   | EDINETソース                                                                                    | 備考                                     |
| ---------------------- | ----- | --------- | -------------------------------------------------------------------------------------------- | -------------------------------------- |
| `sales`                | 売上高   | `売上高`     | `summary["売上高"]` → `summary["売上収益（IFRS）"]` → `pl["売上高"]` → `pl["売上収益（IFRS）"]`                | `_pick_sales_line()` でJP GAAP→IFRS順に取得 |
| `operatingProfit`      | 営業利益  | `営業利益`    | `pl["営業利益"]`                                                                                 | PLが空の半期等では欠ける                          |
| `operatingProfitRatio` | 営業利益率 | ―（フロント算出） | 営業利益 ÷ 売上高                                                                                   | `CompanyTable.tsx` 内でリアルタイム計算          |
| `recurringProfit`      | 経常利益  | `経常利益`    | `summary["経常利益"]`                                                                            | IFRS企業は存在しない                           |
| `netIncome`            | 当期純利益 | `当期純利益`   | `pl["親会社株主に帰属する当期純利益"]` → `summary["親会社株主に帰属する当期純利益"]` → `summary["親会社株主に帰属する当期純利益 (IFRS)"]` | 親会社帰属ベース優先                             |
| `netProfitRatio`       | 純利益率  | ―（フロント算出） | 当期純利益 ÷ 売上高                                                                                  | `CompanyTable.tsx` 内でリアルタイム計算          |
| `comprehensiveIncome`  | 包括利益  | `包括利益`    | `summary["包括利益"]`                                                                            | —                                      |


---

### 1-4. 貸借対照表（BS系）


| フロント列ID                | 表示ラベル  | メトリクスキー  | EDINETソース         | 備考             |
| ---------------------- | ------ | -------- | ----------------- | -------------- |
| `netAssets`            | 純資産額   | `純資産額`   | `summary["純資産額"]` | —              |
| `totalAssets`          | 総資産額   | `総資産額`   | `summary["総資産額"]` | —              |
| `currentAssets`        | 流動資産   | `流動資産`   | `bs["流動資産"]`      | —              |
| `currentLiabilities`   | 流動負債   | `流動負債`   | `bs["流動負債"]`      | —              |
| `liabilities`          | 負債     | `負債`     | `bs["負債"]`        | —              |
| `investmentSecurities` | 投資有価証券 | `投資有価証券` | `bs["投資有価証券"]`    | ネットキャッシュ算出にも使用 |


---

### 1-5. キャッシュフロー（CF系）


| フロント列ID       | 表示ラベル     | メトリクスキー | EDINETソース                                          | 備考                                 |
| ------------- | --------- | ------- | -------------------------------------------------- | ---------------------------------- |
| `cashBalance` | 現金及び現金同等物 | `現金残高`  | `summary["現金及び現金同等物の残高"]` → `cf["現金及び現金同等物"]`      | —                                  |
| `operatingCF` | 営業CF      | `営業CF`  | `summary["営業活動によるキャッシュ・フロー"]` → `cf["営業キャッシュフロー"]` | —                                  |
| `investingCF` | 投資CF      | `投資CF`  | `summary["投資活動によるキャッシュ・フロー"]` → `cf["投資キャッシュフロー"]` | —                                  |
| `fcf`         | FCF       | `fcf`   | 営業CF ＋ 投資CF                                        | `_compute_fcf()` / いずれか欠ければ `null` |
| `financingCF` | 財務CF      | `財務CF`  | `summary["財務活動によるキャッシュ・フロー"]` → `cf["財務キャッシュフロー"]` | —                                  |


---

## 2. 企業詳細チャート（`summaries/{secCode}.json`）のマッピング

`SummaryCharts.tsx` と `financialPickers.ts` がキーを選択する。

### 2-1. 売上高の推移チャート


| チャートの系列 | 参照キー（優先順位）                                 | 備考                             |
| ------- | ------------------------------------------ | ------------------------------ |
| 売上高     | `summary["売上高"]` → `summary["売上収益（IFRS）"]` | `pickSummaryRevenueForChart()` |


### 2-2. 配当金キャッシュアウトチャート


| チャートの系列 | 参照キー（優先順位）                              | 備考                             |
| ------- | --------------------------------------- | ------------------------------ |
| 配当金の支払額 | `cf["配当金の支払額"]` → `cf["配当金の支払額（IFRS）"]` | `pickCfDividendPaid()` / 絶対値表示 |


### 2-3. PL（損益計算書）チャート


| チャートの系列 | 参照キー（優先順位）                                                                                          | 備考                        |
| ------- | --------------------------------------------------------------------------------------------------- | ------------------------- |
| 売上高     | `pl["売上高"]` → `pl["売上収益（IFRS）"]`                                                                    | `pickPlRevenueForChart()` |
| 営業利益    | `pl["営業利益"]`                                                                                        | —                         |
| 親会社純利益  | `pl["親会社株主に帰属する当期純利益"]` → `pl["親会社株主に帰属する四半期純利益"]` → `pl["親会社株主に帰属する当期純利益 (IFRS)"]` → `pl["当期純利益"]` | `pickPlNetIncome()`       |


### 2-4. BS（貸借対照表）チャート


| チャートの系列 | 参照キー        | 備考  |
| ------- | ----------- | --- |
| 総資産     | `bs["総資産"]` | —   |
| 負債      | `bs["負債"]`  | —   |
| 純資産     | `bs["純資産"]` | —   |


---

## 3. フロントで計算する指標（JSONに持たない）

スクリーナーテーブルの列として `computedFrom` 指定されており、JSON取得後にリアルタイム計算する。


| 列ID                    | 計算式                 | 計算箇所                                |
| ---------------------- | ------------------- | ----------------------------------- |
| `operatingProfitRatio` | `営業利益 ÷ 売上高 × 100`  | `CompanyTable.tsx` `getCellValue()` |
| `netProfitRatio`       | `当期純利益 ÷ 売上高 × 100` | `CompanyTable.tsx` `getCellValue()` |


---

## 4. 未実装（常に null）


| 指標         | 理由                 | 将来の方針       |
| ---------- | ------------------ | ----------- |
| PBR        | 株価が必要（BPSは開示から取れる） | 株価API連携後に算出 |
| 時価総額       | 株価 × 発行済株式数        | 同上          |
| ネットキャッシュ比率 | 時価総額が必要            | 同上          |


---

## 5. フィルター条件と対応するメトリクスキー

`FilterContext` → `CompanyTable.tsx` の `passesFilter()` で適用。


| フィルター項目       | メトリクスキー                 | 入力単位          |
| ------------- | ----------------------- | ------------- |
| 会社名検索         | `filerName`             | 文字列           |
| 銘柄コード検索       | `secCode`               | 文字列           |
| 自己資本比率（最小・最大） | `自己資本比率`                | 小数（0.3 = 30%） |
| EPS（最小・最大）    | `EPS`                   | 円             |
| 売上高（最小・最大）    | `売上高`                   | 百万円（内部値は円）    |
| ROE（最小・最大）    | `ROE`                   | 小数（0.1 = 10%） |
| 総資産額（最小・最大）   | `総資産額`                  | 兆円（内部値は百万円換算） |
| お気に入りのみ       | `secCode`（localStorage） | —             |


---

## 6. 表示フォーマット


| 型            | フォーマット関数                           | 出力例                |
| ------------ | ---------------------------------- | ------------------ |
| 売上高・資産等（百万円） | `formatSales()` / 1,000,000 で割って整数 | `47,874`           |
| 比率（小数→%）     | `formatRatio()` / × 100 + `%`      | `19.96%`           |
| 時価総額（百万円）    | `formatSales(String(value))`       | `5,000,000`        |
| PER          | `.toFixed(1)`                      | `12.3`             |
| PBR          | `.toFixed(2)`                      | `1.25`             |
| 配当利回り        | `.toFixed(2) + "%"`                | `2.50%`            |
| ネットキャッシュ比率   | `× 100 + "%"`                      | `15.00%`           |
| 発行済株式総数      | `parseInt().toLocaleString()`      | `1,234,567,890`    |
| チャートY軸       | `String(v)`（現状は生数値、単位なし）           | `4787406` ← 改善余地あり |


---

## 関連ファイル


| ファイル                                                     | 役割                                        |
| -------------------------------------------------------- | ----------------------------------------- |
| `edinet-wrapper/scripts/frontend/build_screener_data.py` | データ生成スクリプト（マッピングの中心）                      |
| `edinet-wrapper/config/screener_columns.json`            | カラム定義（id / label / category / metricsKey） |
| `edinet-screener/public/data/column_manifest.json`       | ↑のコピー（フロントから参照）                           |
| `edinet-screener/public/data/company_metrics.json`       | スクリーナーテーブル用フラットデータ                        |
| `edinet-screener/public/data/summaries/{secCode}.json`   | 企業詳細用時系列データ                               |
| `edinet-screener/components/CompanyTable.tsx`            | スクリーナーテーブル（getCellValue / getSortValue）   |
| `edinet-screener/components/SummaryCharts.tsx`           | 企業詳細チャート                                  |
| `edinet-screener/lib/financialPickers.ts`                | チャート用キー選択（JP GAAP / IFRS フォールバック）         |


---

## 再生成コマンド

```bash
cd edinet-wrapper
# summaries から指標だけ更新
uv run python scripts/frontend/build_screener_data.py --metrics_only

# TSV から summaries ごと作り直す（サンプル）
uv run python scripts/frontend/build_screener_data.py --mode sample

# 全件
uv run python scripts/frontend/build_screener_data.py --mode full
```

詳細は [edinet-wrapper-使い方.md](./edinet-wrapper-使い方.md) を参照。