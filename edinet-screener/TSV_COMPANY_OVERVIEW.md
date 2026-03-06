# TSV から取得できる会社概要情報

EDINET の TSV（有価証券報告書など）から、会社の概要・ジャンル・詳細をどこまで取れるか整理したメモです。

---

## 1. 取得可能な情報

### 1.1 テキスト概要（TEXT カテゴリ）

`parse_tsv()` の **text** に含まれる主な項目:

| 項目名（element_id_table） | 日本語名 | 内容イメージ |
|---------------------------|----------|---------------|
| `DescriptionOfBusinessTextBlock` | **事業の内容** | 会社がどんな事業をしているか（概要） |
| `CompanyHistoryTextBlock` | 沿革 | 設立年・沿革 |
| `OverviewOfBusinessResultsTextBlock` | 業績等の概要 | 業績サマリのテキスト |
| `InformationAboutEmployeesTextBlock` | 従業員の状況 | 従業員数・構成など |
| `BusinessPolicyBusinessEnvironmentIssuesToAddressEtcTextBlock` | 経営方針、経営環境及び対処すべき課題等 | 経営方針・課題 |
| `BusinessRisksTextBlock` | 事業等のリスク | リスク要因 |
| `ResearchAndDevelopmentActivitiesTextBlock` | 研究開発活動 | R&D の概要 |
| `OverviewOfProductionOrdersReceivedAndSalesTextBlock` | 生産、受注及び販売の状況 | 生産・受注・販売 |
| `OverviewOfAffiliatedEntitiesTextBlock` | 関係会社の状況 | 子会社・関連会社 |

**事業の内容** が会社概要として最も重要で、数百〜数千文字の説明が入ります。

### 1.2 基本情報（META カテゴリ）

| 項目名 | 内容 |
|--------|------|
| 会社名 | 企業名 |
| EDINETコード | EDINET の識別子 |
| 証券コード | 銘柄コード |
| 提出書類 | 有価証券報告書など |
| 会計基準 | 日本基準 / IFRS など |
| 当事業年度開始日・終了日 | 決算期 |
| 連結決算の有無 | true/false |

---

## 2. 業種（ジャンル）について

**TSV には業種は含まれていません。**

業種は **EDINET 提出者一覧 CSV**（`EdinetcodeDlInfo.csv`）の **「提出者業種」** 列から取得します。

- 取得元: `https://disclosure2dl.edinet-fsa.go.jp/searchdocument/codelist/Edinetcode.zip`
- カラム例: ＥＤＩＮＥＴコード, 提出者種別, 上場区分, 提出者名, **提出者業種**, 証券コード など
- 業種例: 水産・農林業, 食料品, 鉱業, 建設業, 電気機器, 銀行業, 情報・通信業, サービス業 など（33 業種）

`edinet-wrapper` の `scripts/industry_prediction/prepare_dataset.py` や `download_edinetinfo_csv()` で利用しています。

---

## 3. 現在の summaries / company_metrics との関係

| データ | 含む内容 | 含まない内容 |
|--------|----------|--------------|
| `summaries/*.json` | 会社名, 証券コード, 期間別 summary / pl / bs / cf | TEXT（事業の内容など）, META の一部 |
| `company_metrics.json` | 財務指標（PER, PBR, ROE など） | 業種, 事業の内容 |

**事業の内容** や **沿革** などのテキストを利用するには、`build_screener_data.py` 相当の処理で TSV をパースし、`financial_data.text` を summaries に含めるように拡張する必要があります。

---

## 4. 実装の方向性（案）

1. **事業の内容・沿革**: `build_screener_data.py` を拡張し、`parse_tsv()` の `text` のうち  
   `事業の内容`, `沿革`, `業績等の概要` などを summaries JSON に追加する。
2. **業種**: `EdinetcodeDlInfo.csv` をダウンロードし、EDINETコード ↔ 提出者業種 のマッピングを作成。  
   `company_metrics.json` や別ファイル（例: `companies_master.json`）に業種を格納する。

---

## 5. 参考ファイル

- `edinet-wrapper/src/edinet_wrapper/element_id_table.py` … META, TEXT, SUMMARY のマッピング
- `edinet-wrapper/DATA_STRUCTURE_ANALYSIS.md` … パース後構造の詳細
- `edinet-wrapper/scripts/industry_prediction/prepare_dataset.py` … 業種の取得・マッピング
- `CRAWLER_DATA_TYPES.md` … Edinetcode（企業マスタ）の説明
