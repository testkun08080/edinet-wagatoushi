# EDINET Corpus ワークフロー

## 概要

`edinet-wrapper/scripts/edinet_corpus.sh` と同じ処理を GitHub Actions 上で**月単位**で実行します。  
1 ジョブ = 1 ヶ月分なので、6 時間制限内に収まります。

## 手動実行

1. Actions → **EDINET Corpus** → Run workflow
2. 書類種別・年を選び、必要なら **months** にカンマ区切りで月を指定（例: `1,2,3` = 1〜3 月のみ。未指定で 1〜12 月を並列ジョブで実行）
3. リポジトリに `EDINET_API_KEY` の Secret を設定しておく

## ジョブの分け方

- **月ごと**: `months` 未指定 → 12 ジョブ（1 月〜12 月を並列）
- **一部だけ**: `months`: `1,6,12` → 1 月・6 月・12 月の 3 ジョブのみ

## ローカルで同じことをする

```bash
cd edinet-wrapper
./scripts/edinet_corpus.sh
```

1 チャンクだけ（GHA と同じ動き）:

```bash
cd edinet-wrapper
DOC_TYPE=quarterly YEAR=2019 MONTH=3 ./scripts/edinet_corpus.sh
```
