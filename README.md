# EDINET Corpus ワークフロー

**プロジェクト全体の構成とデータフロー**は [PROJECT_FLOW.md](PROJECT_FLOW.md) にまとめています（EDINET → サンプルデータ → スクリーナー）。**J-Quants 関連はオミット**（使用しない）。

## 概要

`edinet-wrapper/scripts/edinet_corpus.sh` と同じ処理を GitHub Actions 上で**月単位**で実行します。  
1 ジョブ = 1 ヶ月分なので、6 時間制限内に収まります。

---

## 使い方・コマンド

### EDINET コーパス（手動・ローカル）

**手動実行（GitHub Actions）**

1. Actions → **EDINET Corpus** → Run workflow
2. 書類種別・年を選び、必要なら **months** にカンマ区切りで月を指定（例: `1,2,3` = 1〜3 月のみ。未指定で 1〜12 月を並列ジョブで実行）
3. リポジトリに `EDINET_API_KEY` の Secret を設定しておく

**ジョブの分け方**

- **月ごと**: `months` 未指定 → 12 ジョブ（1 月〜12 月を並列）
- **一部だけ**: `months`: `1,6,12` → 1 月・6 月・12 月の 3 ジョブのみ

**ローカルで同じことをする**

```bash
cd edinet-wrapper
./scripts/edinet_corpus.sh
```

1 チャンクだけ（GHA と同じ動き）:

```bash
cd edinet-wrapper
DOC_TYPE=quarterly YEAR=2019 MONTH=3 ./scripts/edinet_corpus.sh
```

---

### スクリーナー（edinet-screener）

| コマンド | 説明 |
|----------|------|
| `cd edinet-screener && npm run dev` | 開発サーバー起動 |
| `cd edinet-screener && npm run build` | データ生成（`data-set/` または `DATA_SET_URL` から）＋ Vike ビルド |
| `cd edinet-screener && npm run build:app` | データ生成なしで Vike ビルドのみ |
| `cd edinet-screener && npm run preview` | ビルド後のプレビュー |

リモートデータセットでビルドする場合:

```bash
cd edinet-screener
DATA_SET_URL=https://.../data-set.zip npm run build
```

---

### サンプルデータ作成（edinet-wrapper）

スクリーナー用の `public/data`（companies.json, summaries, company_metrics）を生成するコマンド。

| コマンド | 説明 |
|----------|------|
| `cd edinet-wrapper && uv run python scripts/fetch_33_companies.py` | 固定 33 社を一括生成（`data-set/` 必須） |
| `cd edinet-wrapper && uv run python scripts/build_screener_data.py --mode sample E00004 E03606 ...` | 指定 EDINET コードで複数社を生成 |
| `cd edinet-wrapper && uv run python scripts/build_screener_data.py --mode sample E00004` | 1 社だけ追加・上書き |
| `cd edinet-wrapper && uv run python scripts/build_screener_data.py --metrics_only` | company_metrics.json を再生成 |

詳細は [edinet-screener/SAMPLE_DATA_COMMANDS.md](edinet-screener/SAMPLE_DATA_COMMANDS.md) を参照。

**wrapper の詳細**（サンプル収集の複数パターン・フロント列と EDINET で足りない指標）: [docs/edinet-wrapper-使い方.md](docs/edinet-wrapper-使い方.md)

---

**J-Quants 関連はオミット**（本プロジェクトでは使用しない）。
