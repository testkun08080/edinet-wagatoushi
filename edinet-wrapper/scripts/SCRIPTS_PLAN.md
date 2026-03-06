# edinet-wrapper/scripts 整理プラン

**※ 実装済み（build_screener_data.py で統合済み）**

**目標**
- 実際のデータを一箇所（`edinet-screener/public/data/`）にまとめ、フロントでわかりやすく表示する
- scripts 以下をすっきりさせる
- **1本の汎用スクリプト**で「サンプル用」か「全件」を実行時に簡単に選択できるようにする

---

## 1. 現状の scripts 一覧と役割

### 1.1 フロント用データ生成（＝「一箇所にまとめる」対象）

| スクリプト | 役割 | 入力 | 出力 | 備考 |
|-----------|------|------|------|------|
| **prepare_sample_companies.py** | data-set 内の TSV をパースし、企業別サマリ＋指標を生成 | EDINET コード列、data-set パス | `edinet-screener/public/data/`（companies.json, summaries/*.json, company_metrics.json） | フロントの**メイン**データソース |
| **build_company_metrics.py** | 既存の summaries から company_metrics.json のみ再生成 | summaries/*.json（固定パス） | company_metrics.json | prepare で既に metrics を出しているが、summaries だけ更新したときに使う |

**フロントが参照する出力（統一先）**
- `edinet-screener/public/data/companies.json` … 企業一覧
- `edinet-screener/public/data/company_metrics.json` … 一覧テーブル・分析ページ用指標
- `edinet-screener/public/data/summaries/{secCode}.json` … 企業別・期間別詳細

### 1.2 コーパス（報告書ファイル）の準備

| スクリプト | 役割 | 入力 | 出力 | 備考 |
|-----------|------|------|------|------|
| **create_corpus_sample.py** | data-set から指定企業・年度の報告書ディレクトリを**コピー**してサンプルコーパスを作成 | 証券/EDINET コード、年度、または --auto_pick | `edinet_corpus-*-2024` 等（TSV/JSON/PDF のコピー） | フロント表示用 JSON は作らない。「ファイルのサブセット」用 |
| **prepare_edinet_corpus.py** | EDINET API で報告書を**ダウンロード**（期間・書類種別指定） | 開始日・終了日・doc_type | edinet_corpus/ 等（TSV+JSON+PDF） | data-set の**元データ取得** |
| **edinet_corpus.sh** | prepare_edinet_corpus を月別・書類種別でループ実行 | 環境変数（DOC_TYPE, YEAR, MONTH） | 上記と同じ | CI / ローカル一括取得用 |
| **download_company_10years.py** | 1社の過去 N 年分をダウンロード | edinet_code, file_type, years | data/（TSV 等） | 単社・長期取得用 |

### 1.3 分析・開発・ドキュメント用

| スクリプト | 役割 | 備考 |
|-----------|------|------|
| **create_sample_data.py** | 固定 TSV 1 ファイルから「データ構造」のサンプル JSON を生成 | ドキュメント・開発者向け。フロントデータとは別 |
| **analyze_data_structure.py** | parse_tsv 結果をコンソールで詳細表示 | 開発・デバッグ用 |
| **analyze_tsv_structure.py** | TSV を直接解析（要素ID・コンテキスト等） | 開発・デバッグ用 |
| **analyze_frequency_per_year.py** | 年度別ファイル数・グラフ出力 | 分析用（matplotlib） |
| **analyze_frequency_per_industry.py** | 業種別集計・グラフ | 分析用（matplotlib） |
| **example_usage.py** | edinet_wrapper の利用例 | サンプルコード |
| **test_import.py** | edinet_wrapper のインポート・依存確認 | 開発・CI 用 |

### 1.4 ML 用（サブディレクトリ）

| スクリプト | 役割 |
|-----------|------|
| **earnings_forecast/prepare_dataset.py** | 2年連続データから HuggingFace 用データセット作成 |
| **industry_prediction/prepare_dataset.py** | 業種ラベル付きデータセット作成 |

### 1.5 その他

- **README_DOWNLOAD.md**, **sample_11companies_2025.json** … ドキュメント・設定
- **test_download.sh** … ダウンロードテスト用

---

## 2. プラン概要：フロント用データを「1本のスクリプト」にまとめる

### 2.1 新規メインスクリプト案：`build_screener_data.py`

**役割**
- 入力: data-set（TSV+JSON が入ったコーパス）、および「対象企業の決め方」
- 出力: 常に **1箇所** `edinet-screener/public/data/`（または `--output` で指定）
  - companies.json
  - summaries/{secCode}.json
  - company_metrics.json（summaries から算出）

**実行時の選択（サンプル vs 全件）**

```text
# サンプル用（少数社だけ）
uv run python scripts/build_screener_data.py --mode sample
uv run python scripts/build_screener_data.py --mode sample E00004 E03606 E05070
uv run python scripts/build_screener_data.py --mode sample --list sample_11companies_2025.json

# 全件（data-set 内の全 EDINET コードを対象）
uv run python scripts/build_screener_data.py --mode full
uv run python scripts/build_screener_data.py --mode full --data_set /path/to/data-set --output /path/to/public/data
```

- **`--mode sample`**  
  - 引数で EDINET コードを渡す、または `--list` で JSON ファイル、未指定ならデフォルト数社（例: 11社）。  
  - 従来の `prepare_sample_companies.py` の動作に相当。
- **`--mode full`**  
  - data-set を `rglob("*.tsv")` などで走査し、存在する EDINET コードをすべて列挙してから、同じパース・集計ロジックで companies / summaries / company_metrics を一括生成。

**オプション案**
- `--data_set`, `--output` … 入力コーパスと出力先（デフォルト: リポジトリの data-set と edinet-screener/public/data）
- `--metrics_only` … 既存の summaries だけを参照し、company_metrics.json のみ再生成（従来の build_company_metrics.py 相当）

### 2.2 統合・整理の対応表

| 現状 | 対応 |
|------|------|
| prepare_sample_companies.py | **build_screener_data.py に統合**（`--mode sample` で代替）。統合後は削除または `build_screener_data.py` から「サンプル用」として呼ぶ形に。 |
| build_company_metrics.py | **build_screener_data.py に組み込み**。通常は summaries 生成と同時に metrics も出力。`--metrics_only` で「summaries のみ既存」のとき metrics だけ再生成。 |
| create_corpus_sample.py | **残す**。役割は「報告書ファイルのコピー」であり、フロント用 JSON 生成とは別。必要なら `scripts/corpus/` に移動。 |
| prepare_edinet_corpus.py, download_company_10years.py, edinet_corpus.sh | **残す**。データ取得レイヤー。フロント用データ生成とは分離。 |
| create_sample_data.py | **残す**（ドキュメント用）。必要なら `scripts/dev/` や `docs/` に移動。 |
| analyze_* | **残す**。開発・分析用。まとめるなら `scripts/analysis/` に移動。 |
| example_usage.py, test_import.py | **残す**。サンプル・テスト用。 |

---

## 3. 実装ステップ案

1. **build_screener_data.py の新規作成**
   - prepare_sample_companies.py のロジック（TSV 収集・パース・companies/summaries/metrics 出力）を流用
   - 企業リスト取得部分だけ分岐:
     - `--mode sample`: 引数 or --list ファイル or デフォルトリスト
     - `--mode full`: data-set を走査して EDINET コード一覧を取得
   - build_company_metrics の計算は同じモジュール内で共通化し、常に metrics も出力（＋ `--metrics_only` オプション）

2. **prepare_sample_companies.py の廃止**
   - ドキュメント・README を `build_screener_data.py --mode sample` に差し替え

3. **build_company_metrics.py の廃止**
   - `build_screener_data.py --metrics_only` で代替できるようにする

4. **（任意）サブディレクトリ整理**
   - `scripts/analysis/` … analyze_*.py, create_sample_data.py
   - `scripts/corpus/` … create_corpus_sample.py（必要なら）
   - ルートに残す: build_screener_data.py, prepare_edinet_corpus.py, download_company_10years.py, edinet_corpus.sh, example_usage.py, test_import.py

5. **README / SAMPLE_DATA_COMMANDS 等の更新**
   - 「サンプルデータ作成」は `build_screener_data.py --mode sample`
   - 「全件で一括」は `build_screener_data.py --mode full`
   - 「metrics だけ更新」は `build_screener_data.py --metrics_only`

---

## 4. データの流れ（整理後イメージ）

```text
[EDINET API]
     │
     ▼
prepare_edinet_corpus.py / download_company_10years.py
     │
     ▼
data-set（edinet_corpus-*-2024 等: TSV + JSON + PDF）
     │
     ▼
build_screener_data.py  --mode sample | full
     │
     ▼
edinet-screener/public/data/
     ├── companies.json
     ├── company_metrics.json
     └── summaries/{secCode}.json
     │
     ▼
フロント（Vike）: /data/companies.json, /data/company_metrics.json, /data/summaries/:secCode.json
```

- **サンプル**: 開発・デモ用に数社だけ `--mode sample` で生成
- **全件**: 本番や検証用に data-set 全体を `--mode full` で一括し、同じディレクトリにまとめる

これで「一つのスクリプトでサンプルか全件かを実行時に選ぶ」形にでき、scripts も役割ごとに整理できます。
