# Cloudflare + GitHub CI/CD 運用ガイド

このドキュメントは、`edinet-screener` を Cloudflare 完結で運用するための実務手順をまとめたものです。

## 構成

- データ保管: Cloudflare R2
- アプリ配信: Cloudflare Workers (`wrangler deploy`)
- CI/CD: GitHub Actions

## 追加されたワークフロー

- `.github/workflows/screener-ci.yml`
  - PR / main push 時の高速検証 (`lint` + `build:app`)
- `.github/workflows/screener-data-pipeline.yml`
  - 日次データパイプライン（R2へ `public-data.tar.gz` を配置）
- `.github/workflows/screener-deploy.yml`
  - R2 からデータを取得し `build:app` 後に Workers へデプロイ

## 必要な GitHub Secrets

### 共通

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_R2_BUCKET`

### データ生成（prod）用

- `DATA_SET_URL` (zip / tar.gz の URL)

## R2 オブジェクト配置ルール

- バージョン: `datasets/<tier>/<YYYY-MM-DD>/public-data.tar.gz`
- latest: `datasets/<tier>/latest/public-data.tar.gz`

`tier` は `sample` または `prod`。

## テスト運転（20MBサンプル）

1. `screener-data-pipeline` を `workflow_dispatch` で実行
2. `dataset_tier=sample` を選択
3. `data_set_url` を空にした場合:
   - リポジトリ内の `edinet-screener/public/data` をそのままパッケージ
4. `data_set_url` を指定した場合:
   - その data-set から sample を再生成してパッケージ
4. 完了後、`screener-deploy` を `dataset_tier=sample` で実行

## 本番運用

1. `screener-data-pipeline` を日次 cron で実行（prod）
2. `DATA_SET_URL` から data-set を取得し `public/data` を再生成
3. 生成物を R2 に version + latest でアップロード
4. `screener-deploy` を main push または手動で実行

## ロールバック手順

1. `screener-deploy` を手動実行
2. `dataset_tier=prod`
3. `dataset_version` に戻したい日付 (`YYYY-MM-DD`) を指定

これにより `datasets/prod/<date>/public-data.tar.gz` を使って再デプロイできます。

## データダイエット方針

`screener-data-pipeline` の `no_raw_tsv=true` を使うと、`raw_tsv` を生成せず容量を削減できます。

注意:
- `raw_tsv` を削ると、大株主時系列など raw TSV 依存機能の情報量が減る可能性があります。

## 監視ポイント

- Actions 失敗率（`screener-data-pipeline`, `screener-deploy`）
- build時間（p50/p95）
- `public-data.tar.gz` のサイズ推移
- R2 バケット容量増加速度
