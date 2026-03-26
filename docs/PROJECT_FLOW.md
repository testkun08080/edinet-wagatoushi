# プロジェクト全体の構成とデータフロー

このドキュメントでは、**EDINET 報告書の取得 → サンプルデータ生成 → Vike ビルド → スクリーナー表示**までの一連の流れと、各コンポーネントの役割を整理します。

**現在の運用方針**: 各ステップは**すべて手動**。**J-Quants 関連はオミット**（使用しない）。

---

## 1. 全体像（2 層 + データソース）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  データソース                                                                  │
│  ┌──────────────┐                                                            │
│  │   EDINET     │                                                            │
│  │   (開示API)   │                                                            │
│  └──────┬───────┘                                                            │
└─────────┼───────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  第1層: edinet-wrapper（取得・パース・サンプル生成）                            │
│  • EDINET API で有価証券報告書・四半期・半期をダウンロード（TSV/PDF/JSON）        │
│  • GHA で取得した結果を手動で data-set に置く想定                                  │
│  • data-set から companies.json / summaries/*.json を生成                      │
│  • summaries から company_metrics.json を生成（EDINET 由来の指標）               │
└─────────────────────────────────────────────────────────────────────────────┘
          │
          │ 出力: edinet-screener/public/data/
          │       companies.json, summaries/*.json, company_metrics.json
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  第2層: edinet-screener（Vike ビルド → 表示）                                 │
│  • public/data を静的データとしてビルドに含める                                 │
│  • Vike + React で企業一覧・個別分析などを表示                                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. データソースの役割

| ソース | 役割 | 主な取得内容 |
|--------|------|----------------|
| **EDINET** | 開示ベースの財務・経営データ | 有価証券報告書・四半期報告書・半期報告書の XBRL/TSV。BS・PL・CF・サマリ（EPS, BPS, 売上高, 経常利益, 純資産, ROE など）。**J-Quants はオミット**のため、PER/PBR・時価総額など株価連動指標は取得しない。 |

---

## 3. フロー詳細

### 3.1 EDINET から報告書を取得する（edinet-wrapper）

- **手段**: EDINET API（`edinet-wrapper` の Downloader）で書類を取得。
- **書類種別**: 有価証券報告書（annual）、四半期報告書（quarterly）、半期報告書（semiannual）など。修正版（*_amended）も選択可能。
- **取得物**: 各書類ごとに **TSV**（XBRL 由来）、**PDF**、メタデータ用 **JSON**。
- **実行方法**:
  - **GitHub Actions**: ワークフローで `edinet_corpus.sh` を実行（1 ジョブ = 1 ヶ月分など）。取得した成果物を**手動で**プロジェクトルートの **data-set/** に置く。
  - **ローカル**: `edinet-wrapper/scripts/edinet_corpus.sh` または `prepare_edinet_corpus.py` で `--doc_type` と `--start_date` / `--end_date` を指定。
- **edinet_corpus とは**: `prepare_edinet_corpus.py` の **デフォルトの出力先ディレクトリ名**（`--output_dir` の既定値が `edinet_corpus`）。  
  edinet-wrapper のカレントで実行すると **`edinet-wrapper/edinet_corpus/`** に、例として `edinet_corpus/quarterly/E00007/<docID>.tsv` のような形で保存される。GHA ではこの中身が成果物として出るので、**それを手動で data-set に配置**する運用。
- **data-set の位置と役割**: **プロジェクトルートの `data-set/`**（または環境変数 `DATA_SET_PATH`）。  
  **GHA で取得したデータを手動でここに置く**想定。

- **2024 年のフォルダ構成（data-set 内の例）**: 書類種別ごとに次のようなディレクトリがある想定です。
  - **大量報告書**: `edinet_corpus-large_holding-2024/large_holding/E?????/`
  - **四半期報告書**: `edinet_corpus-quarterly-2024/quarterly/E?????/`（`quarterly 2` 等の配下もある場合あり）
  - **有価証券報告書**: `edinet_corpus-annual-2024/annual/E?????/`
  - **半期報告書**: `edinet_corpus-semiannual-2024/semiannual/E?????/` または zip 内に同様のパス  
  各 `E?????/` の下に TSV・JSON・PDF を配置。サンプルでは**この4種すべてが揃っている企業**から 6 社を選ぶ。

---

### 3.2 サンプルデータを生成する（edinet-wrapper → edinet-screener/public/data）

- **目的**: スクリーナーが読む **companies.json** / **summaries/*.json** / **company_metrics.json** を、data-set（または EDINET API 単体）から作成する。
- **主なパターン**:

| 方法 | 前提 | コマンド例 | 出力先 |
|------|------|------------|--------|
| 複数社を指定 | data-set | `uv run python scripts/frontend/build_screener_data.py --mode sample E00004 E03606 ...` | `edinet-screener/public/data/` |
| 1 社だけ | data-set | `uv run python scripts/frontend/build_screener_data.py --mode sample E00004` | 同上 |
| 全件一括 | data-set | `uv run python scripts/frontend/build_screener_data.py --mode full` | 同上 |
| company_metrics のみ再生成 | 既に summaries がある | `uv run python scripts/frontend/build_screener_data.py --metrics_only` | `company_metrics.json` のみ更新 |

- **中身**:
  - **companies.json**: 企業一覧（EDINET コード・証券コード・名称など）。
  - **summaries/<証券コード>.json**: 企業ごとの期間別サマリ・PL/BS/CF 等（TSV パース結果）。
  - **company_metrics.json**: テーブル表示用の 1 銘柄 1 行の指標（EDINET 由来: EPS, BPS, 売上高, 経常利益, 純資産, ネットキャッシュ など）。J-Quants はオミットのため PER/PBR 等は含まない。

詳細は [edinet-screener/docs/SAMPLE_DATA_COMMANDS.md](../edinet-screener/docs/SAMPLE_DATA_COMMANDS.md) を参照。

---

### 3.3 スクリーナーで表示する（edinet-screener）

- **技術**: Vike + React。SSR あり。データは **public/data** の静的 JSON を `fetch` で読み込み。
- **利用ファイル**:
  - `/data/companies.json` … 企業一覧
  - `/data/company_metrics.json` … 一覧テーブル・サイドバー・分析ページ用の指標
  - `/data/summaries/<secCode>.json` … 企業別詳細（分析ページ）
- **表示するデータ**: フロントエンドでは **EDINET 由来のデータ（companies, summaries, company_metrics）** を表示。**J-Quants はオミット**のため PER/PBR・時価総額・株価チャートは取得・表示しない。
- **ビルドの順序**: 1) サンプルデータ生成（companies, summaries, company_metrics）→ 2) Vike ビルド（`npm run build` または `npm run build:app`）。
- **開発**: `npm run dev` で開発サーバー。既に存在する `public/data` をそのまま表示。

---

## 4. ディレクトリ・ファイルの関係（簡易）

```
edinet-wagatoushi/
├── README.md                 # 全体の使い方・コマンド要約
├── docs/PROJECT_FLOW.md      # 本ドキュメント（構成とフロー）
├── data-set/                 # （任意）EDINET コーパス。quarterly/ semiannual/ 等の下に Exxxxx/
│
├── edinet-wrapper/           # EDINET 取得・パース・サンプル生成
│   ├── scripts/
│   │   ├── edinet_corpus.sh           # 月単位でコーパス取得
│   │   ├── prepare_edinet_corpus.py   # 期間・書類種別で取得
│   │   ├── download/create_corpus_sample.py # 条件指定でコーパスのサブセット作成
│   │   └── frontend/build_screener_data.py # サンプル/全件で companies, summaries, company_metrics を生成
│   └── ...
│
├── edinet-screener/          # スクリーナー UI
│   ├── public/data/          # ここがデータの受け口
│   │   ├── companies.json
│   │   ├── company_metrics.json
│   │   └── summaries/<secCode>.json
│   ├── scripts/
│   │   ├── generate-data.sh  # ビルド前: data-set → public/data
│   │   └── fetch-dataset.sh  # DATA_SET_URL から data-set 取得
│   └── ...
│
└── docs/
    ├── DATA_SET_ALTERNATIVES.md  # data-set をリモートに置く運用
    └── PROJECT_STRUCTURE.md      # 構成要約（重複を整理）
```

---

## 5. 典型的な利用フロー（要約・手動運用）

1. **EDINET で報告書を集める**  
   GitHub Actions で `edinet_corpus.sh` を実行し、成果物（`edinet_corpus/` の中身）を**手動で**プロジェクトルートの **data-set/** に配置する。

2. **サンプルデータを作る**  
   data-set を入力に、`cd edinet-wrapper && uv run python scripts/frontend/build_screener_data.py --mode sample` や `--mode full` を**手動実行**し、**edinet-screener/public/data** に companies.json / summaries / company_metrics を出力する。

3. **Vike でビルドしてスクリーナーで見る**  
   `cd edinet-screener && npm run build` または `npm run build:app` でビルド。`npm run dev` で開発時は、既存の `public/data` をそのまま表示する。

**ゴール**: サンプルデータをフロントエンド（スクリーナー）に表示すること。自動化は手動でうまくいってから検討する。**J-Quants はオミット**。

**サンプル企業**: **6 社**を対象とする。data-set の 2024 年フォルダのうち、**大量報告書・四半期報告書・有価証券報告書・半期報告書の4種がすべてある企業**のみから 6 社を選び、その 6 社分で `public/data`（companies / summaries / company_metrics）を生成する。

---

## 6. 関連ドキュメント

| ドキュメント | 内容 |
|--------------|------|
| [README.md](../README.md) | コマンド一覧・EDINET コーパス・スクリーナーの概要 |
| [edinet-wrapper/README.md](../edinet-wrapper/README.md) | wrapper の概要とセットアップ |
| [edinet-screener/docs/SAMPLE_DATA_COMMANDS.md](../edinet-screener/docs/SAMPLE_DATA_COMMANDS.md) | サンプルデータ作成コマンドの詳細 |
| [DATA_SET_ALTERNATIVES.md](./DATA_SET_ALTERNATIVES.md) | data-set をリモート（S3/Release 等）に置く運用 |

---

## 7. あとで決めたいこと・確認したいこと

- **J-Quants はオミット**のため、株価チャート・PER/PBR 等の取得・表示は行わない。

この構成とフローについて、足りない説明や変更したい点があれば話し合いながら更新できます。
