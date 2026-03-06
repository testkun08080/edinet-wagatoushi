# edinet-wrapper

[EDINET](https://disclosure2.edinet-fsa.go.jp) のデータ取得・パース用パッケージです。サブモジュールに依存せず、Downloader / Parser を自前で保持します。

- **Downloader**: EDINET API で有価証券報告書等をダウンロード（リトライ・非 JSON 対応済み）
- **Parser**: TSV から貸借対照表（BS）・損益計算書（PL）・キャッシュフロー（CF）・サマリ等を抽出

本プロジェクトでは **uv** を前提にセットアップ・実行します。

---

## 前提

- [uv](https://docs.astral.sh/uv/) がインストールされていること

---

## セットアップ

**必ず `edinet-wrapper` ディレクトリに入ってから** 以下を実行してください。

```bash
cd edinet-wrapper
uv sync
```

以降のコマンドも、すべて **`edinet-wrapper` がカレントディレクトリ** の状態で実行します。

EDINET API を使う場合は、**edinet-wrapper** のルートに `.env` を置き `EDINET_API_KEY=...` を設定してください。スクリプトが自動で読み込みます。

### データ（data-set）について

大容量の **data-set**（EDINET コーパス）はリポジトリに含めていません。**ビルドごとに data-set からデータを引っ張ってビルドする**想定です。

- **リモートに置いてビルド**: データセットを zip/tar.gz で S3・GitHub Release・Hugging Face 等にホストし、`edinet-screener` で `DATA_SET_URL=<URL> npm run build` とすると、未取得時のみダウンロードしてから抽出・ビルドします。ローカルに置きっぱなしにしなくてよいです。詳しくは [docs/DATA_SET_ALTERNATIVES.md](../docs/DATA_SET_ALTERNATIVES.md)。
- **ローカルに data-set を置く**: プロジェクトルートの `data-set/` に置けば、従来どおり `npm run build` でそのまま利用されます。
- **1社だけ試す**: `build_screener_data.py --mode sample E00004` で 1 社分を指定し、`public/data` を更新できます。

```bash
# .env を使う場合（スクリプトが自動読み込みするので --env-file は不要）
uv run python scripts/download_company_10years.py --edinet_code E02144 --file_type tsv --years 1
```

uv の `--env-file` を使う場合は、**uv run の直後**に書きます: `uv run --env-file .env python scripts/...`

---

## 使い方

**実行場所**: すべて `edinet-wrapper` ディレクトリで実行してください（`cd edinet-wrapper` してから）。

### 動作確認

```bash
cd edinet-wrapper
uv run python scripts/test_import.py
uv run python scripts/example_usage.py
```

### スクリプトの実行

Python スクリプトはすべて `uv run` で実行します。

```bash
cd edinet-wrapper
# 企業の10年分ダウンロード例
uv run python scripts/download_company_10years.py --edinet_code E02144 --file_type tsv --years 1

# その他
uv run python scripts/analyze_data_structure.py ...
```

Downloader / Parser は `from edinet_wrapper import ...` で利用できます。ダウンロード手順の詳細は `scripts/README_DOWNLOAD.md` を参照してください。本体の `downloader.py` は `src/edinet_wrapper/downloader.py` で、ここを編集して維持します。

---

## EDINET-Bench の再現（uv 前提）

[EDINET-Bench](https://huggingface.co/datasets/SakanaAI/EDINET-Bench) を再現する場合は、以下のように **uv run** でスクリプトを実行します。

> 有価証券報告書は API で過去 10 年分のみ取得可能なため、実行時期によって得られるデータ期間は変わります。

### EDINET コーパスの構築

```bash
uv run python scripts/prepare_edinet_corpus.py --doc_type annual --start_date 2024-01-01 --end_date 2025-01-01
```

```bash
bash scripts/edinet_corpus.sh
```

> 10 年分・多数銘柄のダウンロードは EDINET に負荷がかかるため、並列リクエストは控えめにしてください。

### 不正検出タスク

```bash
uv run python scripts/fraud_detection/prepare_fraud.py
uv run python scripts/fraud_detection/prepare_nonfraud.py
uv run python scripts/fraud_detection/prepare_dataset.py
```

```bash
uv run python scripts/fraud_detection/analyze_fraud_explanation.py
```

### 業績予測タスク

```bash
uv run python scripts/earnings_forecast/prepare_dataset.py
```

### 業種予測タスク

```bash
uv run python scripts/industry_prediction/prepare_dataset.py
```

---

## 参照

- [SakanaAI/edinet2dataset](https://github.com/SakanaAI/edinet2dataset)（データセット構築）
- [EDINET-Bench](https://huggingface.co/datasets/SakanaAI/EDINET-Bench)（ベンチマークデータセット）
- [Paper](https://arxiv.org/abs/2506.08762) | [Blog](https://sakana.ai/edinet-bench/)
- セットアップの詳細・トラブルシューティング: `SETUP.md`
