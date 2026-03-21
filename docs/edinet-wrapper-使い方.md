# edinet-wrapper の使い方（データ収集・ビルド・フロント連携）

**実行ディレクトリ**: コマンドはすべて `edinet-wrapper` をカレントにしてから実行します（`cd edinet-wrapper`）。

**前提**: [uv](https://docs.astral.sh/uv/) で `uv sync` 済み。大容量の **data-set**（EDINET コーパス）はリポジトリ外または `data-set/` に配置します。

---

## 1. パッケージの役割

| 領域 | 内容 |
|------|------|
| **`edinet_wrapper` パッケージ** | TSV をパースして `summary` / `pl` / `bs` / `cf` に分解（`parse_tsv` 等） |
| **`build_screener_data.py`** | `data-set` 内の TSV+JSON を走査し、`edinet-screener/public/data/` に **正規化済み JSON** を出力 |
| **ダウンロード系** | `download_company_10years.py` 等 — EDINET API キーが必要な場合は `edinet-wrapper/.env` に `EDINET_API_KEY` |

フロントは **TSV を直接読まず**、`companies.json` / `summaries/{secCode}.json` / `company_metrics.json` を読みます。

---

## 2. フロントの列とデータの対応

- **列定義の単一ソース**: `edinet-wrapper/config/screener_columns.json`  
  ビルド時に `edinet-screener/public/data/column_manifest.json` が同内容で生成されます。
- **1 銘柄 1 行の指標**: `company_metrics.json` の `metrics[]`。キー名は `metricsKey`（例: `ROE`, `PER`, `dividendPerShare`）と一致させています。
- **型**: 多くは文字列（円・比率の生値）、`PER` / `配当利回り` など一部は数値。

### 2.1 EDINET（開示）だけでは埋まらない列

次の列は **`build_screener_data.py` で株価を使わない**ため、**リアルタイム株価・時価が無いと意味のある値を出せません**。

| 列 ID（概ね） | `company_metrics` キー | 理由 |
|----------------|-------------------------|------|
| PBR | `PBR` | 株価 ÷ BPS が必要。BPS は開示から取れるが **株価が無い** |
| 時価総額 | `時価総額` | 株価 × 発行済株式数 |
| ネットキャッシュ比率 | `ネットキャッシュ比率` | 設計上は時価総額で割る想定のため、時価が無いと算出しない |

**株価 API を繋いだ場合**に、上記を計算して同じキーへ書き込む想定です（未実装）。

### 2.2 開示＋自前計算で埋まる列

| 内容 | 備考 |
|------|------|
| PER（`PER`） | summary の「株価収益率」を数値化。**最新期が四半・半期で欠ける場合**は、**過去の開示からキー単位で遡及**して補完（`build_screener_data.py` 内 `_merge_edinet_valuation_from_older_periods`）。 |
| ROE / BPS（開示） | 同様に補完あり。**補完元の期と「計算日」の最新期は一致しない**場合がある。 |
| ROE（算出）`roeCalculated` | 親会社帰属当期純利益 ÷ 純資産額（**最新期**の数値） |
| 配当利回り（`配当利回り`） | DPS ÷ (EPS×PER) の**参考値**。PER が開示ベースのため市場利回りとは異なる。異常値は `null`（実装ルールあり） |

詳細は [EDINET指標の分類.md](./EDINET指標の分類.md) を参照してください。

---

## 3. サンプル用に企業データを集める方法（複数パターン）

「サンプル」とは **`data-set` に既にある TSV** を対象に、`public/data` を生成することです（ダウンロードは別スクリプト）。

### 3.1 固定リスト（11 社など）でビルド

`scripts/sample_11companies_2025.json` のように、`edinetCode` の配列を用意します。

```bash
cd edinet-wrapper
uv run python scripts/build_screener_data.py --mode sample \
  --list scripts/sample_11companies_2025.json \
  --data_set ../data-set \
  --output ../edinet-screener/public/data
```

- **`data_set`**: 未指定ならリポジトリルートの `data-set`（`edinet-wrapper` の親からの相対で `../data-set`）。
- **`output`**: 未指定なら `../edinet-screener/public/data`。
- 同一 EDINET コードの TSV が **複数コーパス**（四半・年次・サンプル用フォルダ等）にあれば、**期間順にすべて**読み込みます（処理時間が伸びます）。

### 3.2 EDINET コードを直接指定

```bash
uv run python scripts/build_screener_data.py --mode sample E02367 E04473
# または
uv run python scripts/build_screener_data.py --mode sample --edinet_codes E02367,E04473
```

### 3.3 data-set 内の全企業（フルスキャン）

```bash
uv run python scripts/build_screener_data.py --mode full \
  --data_set ../data-set \
  --output ../edinet-screener/public/data
```

`data-set` 以下のパスから `E#####` を検出し、重複なく処理します。

### 3.4 コーパスサブセットのコピー（`create_corpus_sample.py`）

**別ディレクトリに「サンプル用コーパスだけ」コピー**したい場合に使います（年次・四半・半期の組み合わせや自動ピック）。

```bash
cd edinet-wrapper

# 例: 証券コードと年度を指定（デフォルトは scripts 内のデフォルト銘柄・年度）
uv run python scripts/create_corpus_sample.py --year 2025

# 例: EDINET コードとドキュメント種別
uv run python scripts/create_corpus_sample.py --edinet_codes E02367 E04473 --types annual,quarterly --year 2025

# 例: data-set から条件で自動ピック（6 社など）
uv run python scripts/create_corpus_sample.py --auto_pick --year 2024 --auto_pick_size 6
```

出力先や `data-set` のルートはスクリプトのオプションに従います（`create_corpus_sample.py` の先頭ドキュメント参照）。  
その後、**ビルドの入力 `data_set` をそのコピー先に向ける**か、リポジトリの `data-set` にマージしてから `build_screener_data.py` を実行します。

### 3.5 `company_metrics.json` だけ再生成

`summaries/*.json` はそのままに、指標行だけ作り直します。

```bash
cd edinet-wrapper
uv run python scripts/build_screener_data.py --metrics_only \
  --output ../edinet-screener/public/data
```

TSV を読み直さないため高速です。列定義や `summary_to_metrics_row` のロジックを変えたあとに使います。

### 3.6 その他のよく使うオプション

| オプション | 説明 |
|------------|------|
| `--no_raw_tsv` | `raw_tsv/` への生 TSV 保存を省略（容量削減） |
| `--no_report` | サンプルモードで `all_keys_report` を出さない |
| `--strict` | データ品質で重要列が全社欠損なら exit 1 |

---

## 4. ビルド成果物（`public/data`）

| ファイル | 説明 |
|----------|------|
| `companies.json` | 一覧用の企業リスト（サンプルモードでは `--list` または引数の社のみ） |
| `summaries/{secCode}.json` | 企業ごとの全期間の `summary` / `pl` / `bs` / `cf` |
| `company_metrics.json` | テーブル用の最新スナップショット 1 行／銘柄 |
| `column_manifest.json` | 列 ID と `metricsKey` の対応（フロントの列定義と同期） |
| `data_quality_report.json` / `.md` | 列ごとの欠損集計 |
| `all_keys_report.json` / `.md` | サンプル時オプションで、各期のキー一覧 |
| `raw_tsv/` | オプションで、パース元 TSV のメタ付きコピー |

---

## 5. 関連ドキュメント

| ドキュメント | 内容 |
|--------------|------|
| [EDINET指標の分類.md](./EDINET指標の分類.md) | 開示そのまま／算出／株価が要る指標 |
| [不足データまとめ.md](./不足データまとめ.md) | 欠損しやすい項目と原因の整理 |
| [ビルドとデータ品質のプラン.md](./ビルドとデータ品質のプラン.md) | 品質レポート・列定義の設計メモ |
| `edinet-screener/SAMPLE_DATA_COMMANDS.md` | スクリーナー向けコマンド集 |
| `edinet-wrapper/scripts/README_DOWNLOAD.md` | ダウンロード手順 |
