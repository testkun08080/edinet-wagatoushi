# edinet-wrapper/scripts 整理プラン（運用優先版）

このディレクトリは、汎用化よりも「日常運用で迷わないこと」を優先して、以下の2グループで使う。

---

## 1) ダウンロード用スクリプトまとめ

EDINET から原データ（TSV/JSON/PDF）を取ってくるためのスクリプト群。

| スクリプト                             | 役割                                           | 主な用途               |
| -------------------------------------- | ---------------------------------------------- | ---------------------- |
| `download/prepare_edinet_corpus.py`    | 期間・書類種別を指定して一括ダウンロード       | 月次/期間指定の取得    |
| `download/download_company_10years.py` | 単一企業の過去 N 年分を取得                    | 企業ピンポイント検証   |
| `download/edinet_corpus.sh`            | `prepare_edinet_corpus.py` をループ実行        | バッチ実行             |
| `download/test_download.sh`            | ダウンロード系の動作確認                       | 実行前の軽いテスト     |
| `download/create_corpus_sample.py`     | 既存コーパスからサンプル企業だけ抽出（コピー） | 小さな検証用データ作成 |

### 基本フロー（ダウンロード）

```bash
# 1) 期間指定でまとめて取得
uv run python scripts/download/prepare_edinet_corpus.py ...

# 2) 必要なら単社データを追加取得
uv run python scripts/download/download_company_10years.py --edinet_code E02144 --file_type tsv --years 10
```

補足:

- 詳細パラメータは `scripts/download/README_DOWNLOAD.md` を正とする。
- `EDINET_API_KEY` の設定が前提。

---

## 2) フロントエンドのデータ作成スクリプトまとめ

ダウンロード済みコーパス（TSV など）から、フロント表示用 JSON を作るスクリプト群。

| スクリプト                        | 役割                                    | 出力先                          |
| --------------------------------- | --------------------------------------- | ------------------------------- |
| `frontend/build_screener_data.py` | フロント向けデータを作成（sample/full） | `edinet-screener/public/data/`  |
| `frontend/sample_companies.json`  | サンプル企業リスト                      | `build_screener_data.py` の入力 |

### 基本フロー（フロントデータ作成）

```bash
# サンプル企業のみ
uv run python scripts/frontend/build_screener_data.py --mode sample --list scripts/frontend/sample_companies.json

# 全件生成
uv run python scripts/frontend/build_screener_data.py --mode full

# 10年ごとで取得したデータ（edinet-wrapper/data）を称する場合
uv run python scripts/frontend/build_screener_data.py --mode full --data_set data --output ../edinet-screener/public/data

```

生成物（フロント参照先）:

- `edinet-screener/public/data/companies.json`
- `edinet-screener/public/data/company_metrics.json`
- `edinet-screener/public/data/summaries/*.json`

---

## 3) 位置づけ（補助スクリプト）

以下は補助用途（分析・調査・開発確認）として扱う。

- `analyze_tsv_structure.py`
- `create_sample_data.py`
- `example_usage.py`

この3つは、上記2グループ（ダウンロード / フロントデータ作成）の主導線には入れない。

---

## 4) 運用ルール（迷わないための最小ルール）

1. 原データが必要なら、まず「ダウンロード用スクリプト」を使う。
2. フロント表示を更新したいなら、`scripts/frontend/build_screener_data.py` を実行する。
3. 分析系スクリプトは、デバッグ・調査時のみ使う。

この区分で、`scripts` は「取得」と「表示用生成」の2段階で扱う。
