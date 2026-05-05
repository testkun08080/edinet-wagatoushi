# EDINET DB と本プロジェクト（edinet-screener）の機能比較

**目的**: 第三者サイト [EDINET DB](https://edinetdb.jp/)（企業ページ例: `/company/E02367`）と、本リポジトリの Web スクリーナーが **何を揃えていて、何が違うか** を表で整理する。

**注意**

- 比較対象は **edinet-screener**（静的 JSON + Vike）。`edinet-wrapper` の取得範囲は [DATA_PIPELINE_AND_CALCULATIONS.md](./DATA_PIPELINE_AND_CALCULATIONS.md) を正とする。
- EDINET DB 側の仕様は **2026 年初頭時点の公開 UI**（保存 HTML・サイト説明）に基づく。相手先の機能追加は都度変わり得る。

**関連ドキュメント**

| 内容 | ファイル |
|------|----------|
| 列・メトリクス・UI ギャップ（実装準拠） | [METRICS_UI_AND_DB_GAP.md](./METRICS_UI_AND_DB_GAP.md) |
| 算出式・JSON 構造 | [DATA_PIPELINE_AND_CALCULATIONS.md](./DATA_PIPELINE_AND_CALCULATIONS.md) |

---

## 1. サイト全体・ナビゲーション

| 機能 | EDINET DB | edinet-screener |
|------|:-----------:|:---------------:|
| ヘッダー横断検索（企業名・コード） | ○ | △（一覧・フィルタ中心。同等のグローバル検索バーはなし） |
| 財務指標ランキング（ROE・健全性スコア等） | ○ | × |
| IR テーマ／DX・AI 系ランキング | ○ | × |
| 財務スクリーニング（専用画面） | ○ | △（ホームの `CompanyTable` で一部相当） |
| 複数企業の比較ページ | ○ | × |
| 大株主の全社横断検索 | ○ | ×（企業詳細の大株主タブのみ） |
| 指標解説・スコアリング説明のサイト内ドキュメント | ○ | △（本リポの `docs/` は開発者向け） |
| AI 連携・エクスポート等 | ○ | × |

凡例: **○** あり　**△** 一部または別 UI　**×** なし

---

## 2. 企業ページのヘッダー・要約

| 項目 | EDINET DB | edinet-screener |
|------|:-----------:|:---------------:|
| 企業名・証券コード表示 | ○ | ○ |
| EDINET コードを URL に使う（例 `E02367`） | ○ | ×（URL は証券コード `@secCode`） |
| 業種・カテゴリ・パンくず | ○ | × |
| 1 行要約（売上・ROE 等の文章） | ○ | × |
| KPI カード（売上・ROE・自己資本比率・健全性スコア等） | ○ | × |
| OGP / 構造化データ（SNS 用） | ○ | △（タイトル設定はあり） |

---

## 3. AI・ナラティブ・IR

| 項目 | EDINET DB | edinet-screener |
|------|:-----------:|:---------------:|
| AI 総合所見（有報テキスト反映など） | ○ | × |
| 収益性／安全性／CF の短文サマリーカード | ○ | × |
| IR 資料の AI 構造化データへの導線 | ○ | × |

---

## 4. 企業詳細のタブ・セクション対応

| タブ・セクション | EDINET DB | edinet-screener |
|------------------|:-----------:|:---------------:|
| 財務データ（グラフ＋表のハブ） | ○ | △（「サマリー」＋ PL／BS／CF タブに分割） |
| 財務健全性スコア（ゲージ・内訳・推移） | ○ | × |
| 主要財務指標（解説付き整理） | ○ | △（「指標」タブ＝数値一覧が中心） |
| ベンチマーク | ○ | × |
| 人的資本・ESG（専用タブ） | ○ | × |
| 大株主 | ○ | ○（時系列コンポーネント） |
| 保有不動産（地価・リスク付与等） | ○ | × |
| 関係会社（法人番号連携等） | ○ | × |
| 役員報酬（XBRL 詳細） | ○ | × |

---

## 5. チャート（時系列ビジュアル）

| チャート | EDINET DB | edinet-screener（`SummaryCharts` 等） |
|----------|:-----------:|:--------------------------------------:|
| 売上高・純利益推移 | ○ | △（売上単独＋ PL で売上・営業利益・親会社純利益の複合） |
| 利益率・ROE 推移 | ○ | × |
| キャッシュフロー推移 | ○ | ×（CF は表） |
| EPS・PER 推移 | ○ | × |
| 配当金・配当性向推移 | ○ | △（配当支払額の棒グラフあり／性向の専用時系列チャートはなし） |
| BPS・自己資本比率推移 | ○ | × |
| 財務健全性スコア推移 | ○ | × |

---

## 6. 表・投資指標・詳細財務

| 項目 | EDINET DB | edinet-screener |
|------|:-----------:|:---------------:|
| EPS・PER・BPS・PBR・ROE・自己資本比率 | ○ | ○（指標・メトリクス） |
| 配当／株、配当性向、配当利回り | ○ | ○ |
| 営業／投資／財務 CF・FCF | ○ | ○ |
| **DOE（%）** | ○（年度表） | ×（`company_metrics` / 指標タブに未掲） |
| **財務レバレッジ**（サイト定義の列） | ○ | ×（D/E レシオは別指標としてあり） |
| 四半期業績ブロック | ○ | △（書類種別フィルタで四半期を切替） |
| ネットキャッシュ・ネットデット等の脚注付き詳細 | ○ | △（ネットキャッシュ系は指標にあり／同一定義の脚注はなし） |
| **PL／BS／CF の行レベル開示** | △（要約寄り） | **○**（TSV 由来の広い行を表表示） |

---

## 7. edinet-screener にあって EDINET DB 企業ページと差が出やすいもの

| 項目 | 内容 |
|------|------|
| 静的 JSON のみで動作 | バックエンド API なし（[PROJECT_FLOW.md](./PROJECT_FLOW.md)） |
| 開示の種類 × 表示年数 | 四半期／有報などと年数トグル（`analyzeReportKind` / `analyzeVisibleYears`） |
| お気に入り・閲覧履歴 | React Context + localStorage |
| ホームスクリーナー | 列の表示切替、プリセット、CSV、共有 |
| 追加系指標 | ROIC、Piotroski F-Score、CAGR、連続増配年数、流動比率、D/E、希薄化 EPS など（[screener_columns.json](../edinet-wrapper/config/screener_columns.json) / 企業詳細「指標」） |

---

## 8. 一行サマリ

| | |
|--|--|
| **EDINET DB が強い** | 健全性スコア、AI 文章、IR・ESG・不動産・関係会社・役員報酬、ランキング／比較、多チャート、DOE 等の表設計。 |
| **本アプリが強い** | PL／BS／CF の**細かい行**、スクリーナー運用、静的配布、開示種別の切替、一部の追加財務指標。 |

---

## 9. ギャップのうち、現行データで実装しうるもの

上表で **edinet-screener が × または △** の項目のうち、**既存の `summaries/{secCode}.json`（多期間の `summary` / `pl` / `bs` / `cf`）・`company_metrics.json`・（D1 運用時）SQLite の `companies` テーブル**から追加実装の足場になり得るものをピックアップする。ここは「実装タスク確定」ではなく、**データ可否のメモ**である。

### 9.1 データの前提（正本）

- **多期間**: [`summaries/*.json`](../edinet-screener/public/data/summaries/) の `periods[]` は [`build_public_data_from_db.py`](../edinet-wrapper/scripts/pipeline/build_public_data_from_db.py) の `period_financials` と同型（`summary_json` / `pl_json` / `bs_json` / `cf_json` をパースした結果）。
- **最新1行指標**: [`summary_to_metrics_row`](../edinet-wrapper/scripts/frontend/build_screener_data.py) → `company_metrics.json`。PBR・時価総額・ネットキャッシュ比率など **生成上 `null` の列**は [METRICS_UI_AND_DB_GAP.md](./METRICS_UI_AND_DB_GAP.md) 表 A を参照。
- **業種**: D1 スキーマの [`companies.industry`](../edinet-wrapper/sql/d1_schema.sql) は取り込みパイプラインで埋まり得るが、**TSV 直生成の `companies.json` は `edinetCode` / `secCode` / `filerName` のみ**で、現行フロントは `companies.json` を `fetch` していない（METRICS §1）。

### 9.2 ピックアップ表

| ギャップ（EDINET 側イメージ） | データ根拠 | 実装の向き | パイプライン改修 |
|------------------------------|------------|------------|:----------------:|
| 利益率・ROE 推移チャート | 各期 `pl` / `summary` | [`SummaryCharts`](../edinet-screener/components/SummaryCharts.tsx) 系の追加（Recharts）。営業利益率・純利益率・開示 ROE／算出 ROE を期ごとに算出 | 不要（フロント派生で可） |
| CF 推移チャート | 各期 `cf` / `summary` の営業・投資・財務 CF | 折れ線／積み上げ。CF 表は既にあるため可視化のみ | 不要 |
| EPS・PER・BPS・自己資本比率の時系列 | 各期 `summary`（１株当たり系・株価収益率・自己資本比率） | 期ごとパースしてチャート | 不要。PER は期によって開示が欠ける場合あり（脚注で仕様化） |
| 配当性向の時系列 | 各期 `summary` の配当性向・DPS・EPS | チャートまたは表列 | 不要（開示がある期のみ表示） |
| KPI カード（売上・ROE・自己資本比率など） | `company_metrics` の最新行 | 分析ページヘッダ直下のカード | 不要 |
| 1 行要約（**非 AI**） | 最新行 + 任意で YoY 文字列 | テンプレート文への数値差し込み（EDINET の AI 所見とは別物） | 不要 |
| 収益性／安全性／CF の短文カード（ルールベース） | ROE・自己資本比率・FCF 等 | 閾値による条件分岐テキスト。**健全性スコアの代替ではない** | 不要 |
| DOE（%） | DPS・発行済株式総数・純資産額等（開示に依る定義を固定） | `summary_to_metrics_row` で算出 → 列・指標タブ。式は [DATA_PIPELINE_AND_CALCULATIONS.md](./DATA_PIPELINE_AND_CALCULATIONS.md) に追記推奨 | **要**（JSON にキーを載せる場合） |
| 財務レバレッジ（例: 総資産÷純資産） | `総資産額`・`純資産額`（`summary` / `bs`） | 上と同様に算出列として固定。EDINET の列と用語を揃えるなら定義をドキュメント化 | **要**（列追加時） |
| ネットキャッシュ比率 | 既存 `_net_cash` と総資産等 | ビルドで `ネットキャッシュ比率` を数値化（現状は多く `null`） | **要** |
| ランキング風ページ | 全社 `company_metrics.json` | クライアントでソートした一覧、または事前スライス JSON | 不要（全件 `fetch` のペイロードは別途検討） |
| 企業比較（少数社） | 複数 `summaries/*.json` | 同一指標の横並び UI・ルート | 不要 |
| ヘッダ横断検索 | `company_metrics` の `filerName` / `secCode` | コンボボックス等 | 不要 |
| ベンチマーク（業界中央値など） | 同業フィルタには **業種キーが JSON に必要** | `company_metrics`（または `companies.json`）へ `industry` を載せる | **要**（静的 JSON へ出力） |
| 業種・パンくず | D1 `companies.industry` または提出者マスタ | 上記と同じくビルド出力に含める | **要** |

D1 のみをソースにする運用では、[`build_public_data_from_db.py`](../edinet-wrapper/scripts/pipeline/build_public_data_from_db.py) を拡張し、`companies` と JOIN して **業種付きの `company_metrics` または `companies.json`** を吐く形が現実的である。

### 9.3 本節の対象外（別データソースまたは別モデル）

次は **現行の有報／四半期 TSV 由来 JSON だけでは足りない**、または EDINET DB と同等のロジック再現が別途必要なものとして切り離す。

- AI 総合所見、有報テキスト全文検索、IR 資料のセクション構造化
- 人的資本・ESG・保有不動産（外部地価等）・関係会社（法人番号 LLM 構造化）・役員報酬（XBRL 詳細）
- EDINET DB と**同一の**財務健全性スコア・スコア推移（独自ロジックの設計・検証が必要）

---

更新したら、本ファイル先頭の **注意** の年・根拠を見直してください。
