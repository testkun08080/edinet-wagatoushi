# GitHub Actions（EDINET Corpus）と同等の処理をローカルで実行する

`.github/workflows/edinet_corpus.yml` で行っている処理を、ローカルで同じように実行する手順です。

## 概要

- **GitHub Actions**: 書類種別・年・月を指定し、**1 ジョブ = 1 ヶ月分**で `edinet_corpus.sh` を実行（6 時間制限に収めるため月単位）。
- **ローカル**: 同じ環境変数・同じスクリプトで「1 ヶ月だけ」または「複数月・全年」を実行できます。

---

## 前提条件

- **uv** がインストールされていること（[astral-sh/uv](https://github.com/astral-sh/uv)）
- **Python 3.12**（uv でインストール可能）
- **EDINET API キー**（[EDINET API](https://disclosure.edinet-fsa.go.jp/) で取得）

---

## 1. 環境構築（GitHub Actions と同じ手順）

```bash
# リポジトリルートから
cd edinet-wrapper

# uv で Python 3.12 を利用（未インストールなら uv が入れる）
uv python install 3.12

# 依存関係をインストール（GHA の "Install dependencies" に相当）
uv sync

# EdinetcodeDlInfo 用の data ディレクトリ（GHA の "Ensure data directory" に相当）
mkdir -p data
```

---

## 3. 環境変数の設定

EDINET API キーを設定します。**GitHub Actions では `secrets.EDINET_API_KEY` を渡している部分**に相当します。

### 方法 A: `.env` に書く（推奨）

```bash
# edinet-wrapper/.env
EDINET_API_KEY=あなたのAPIキー
```

`prepare_edinet_corpus.py` は `edinet-wrapper/.env` を読み込みます。`.env` は `.gitignore` 済みなのでコミットされません。

### 方法 B: 実行時に渡す

```bash
export EDINET_API_KEY=あなたのAPIキー
# その後でスクリプトを実行
```

---

## 4. 実行方法

### 4.1 「1 ヶ月だけ」実行（GitHub Actions の 1 ジョブと同じ動き）

ワークフローで指定している **書類種別・年・月** をそのまま環境変数で渡します。

```bash
cd edinet-wrapper

DOC_TYPE=quarterly YEAR=2019 MONTH=3 bash scripts/download/edinet_corpus.sh
```

- **DOC_TYPE**: `annual` / `quarterly` / `semiannual` / `annual_amended` / `quarterly_amended` / `semiannual_amended`
- **YEAR**: 年（例: `2019`）
- **MONTH**: 月 1〜12（例: `3`）

例: 四半期報告書・2020 年・6 月だけ実行

```bash
DOC_TYPE=quarterly YEAR=2020 MONTH=6 bash scripts/download/edinet_corpus.sh
```

### 4.2 複数ヶ月を連続で実行（ローカルで複数チャンク）

GHA の `matrix.month: [1,6,12]` のように「1 月・6 月・12 月だけ」やりたい場合:

```bash
cd edinet-wrapper

for m in 1 6 12; do
  DOC_TYPE=quarterly YEAR=2019 MONTH=$m bash scripts/download/edinet_corpus.sh
done
```

### 4.3 全年・全月をループ（ローカル用デフォルト動作）

環境変数 **DOC_TYPE / YEAR / MONTH を付けず**に実行すると、`edinet_corpus.sh` 内のデフォルト（`doc_types` と `years`）で **1〜12 月を順に**実行します。

```bash
cd edinet-wrapper
bash scripts/download/edinet_corpus.sh
```

対象の書類種別・年は `edinet_corpus.sh` の `doc_types` と `years` を編集して変更できます。

---

## 5. 出力の場所

- ダウンロード結果: **`edinet-wrapper/edinet_corpus/`** 以下
  - 書類種別ごと・EDINET コードごとのディレクトリに TSV・PDF・メタ JSON が保存されます。
- GitHub Actions の「Upload corpus artifact」では、この `edinet-wrapper/edinet_corpus/` を成果物としてアップロードしています。

---

## 6. 対応関係のまとめ

| GitHub Actions の入力／設定 | ローカルでの指定方法                        |
| --------------------------- | ------------------------------------------- |
| 書類種別（doc_type）        | `DOC_TYPE=quarterly` など                   |
| 年（year）                  | `YEAR=2019` など                            |
| 月（months → matrix.month） | `MONTH=3` で 1 ヶ月。複数月はシェルでループ |
| EDINET API キー             | `.env` の `EDINET_API_KEY` または `export`  |

| GHA のステップ         | ローカルでの対応                                                |
| ---------------------- | --------------------------------------------------------------- |
| Checkout               | `git clone <リポジトリURL>`                                     |
| Install uv             | 手元に uv をインストール                                        |
| Set up Python 3.12     | `uv python install 3.12`                                        |
| Install dependencies   | `cd edinet-wrapper && uv sync`                                  |
| Ensure data directory  | `mkdir -p data`                                                 |
| Run corpus (one month) | `DOC_TYPE=... YEAR=... MONTH=... bash scripts/download/edinet_corpus.sh` |
| Upload artifact        | 手動で `edinet-wrapper/edinet_corpus/` をバックアップ・共有     |

---

## 7. トラブルシューティング

- **`EDINET_API_KEY environment variable is not set`**  
  → `.env` に `EDINET_API_KEY` を書くか、実行前に `export EDINET_API_KEY=...` を実行してください。

- **`Downloader` や `edinet_wrapper` でエラー**  
  → `cd edinet-wrapper && uv sync` で依存関係を入れ直してください。

- **`data/` がない**  
  → `edinet-wrapper` で `mkdir -p data` を実行してください。Downloader がここに EdinetcodeDlInfo を置きます。

- レート制限や API エラー  
  → `prepare_edinet_corpus.py` 内のリトライ・待機時間で対応しています。しばらく待ってから再実行してください。

---

## 参考

- ワークフロー定義: `.github/workflows/edinet_corpus.yml`
- ワークフロー説明: `.github/workflows/README.md`
- 実行スクリプト: `edinet-wrapper/scripts/download/edinet_corpus.sh`
- 実処理: `edinet-wrapper/scripts/download/prepare_edinet_corpus.py`
- ダウンローダー本体: `edinet-wrapper/src/edinet_wrapper/downloader.py`（ここを編集して維持する）
