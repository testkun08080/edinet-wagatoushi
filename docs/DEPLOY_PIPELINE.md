# DEPLOY PIPELINE (Production-ready)

このドキュメントは、`sample` 運用から `full` 運用へ切り替え可能な本番想定パイプラインを定義します。
現在は `DATA_SOURCE=dataset|d1|hybrid` を選択可能です。本番運用では `d1` を既定とし、Cloudflare D1 を永続DBの正本にします。

## 目的

- サンプルデータでも本番と同じ実行経路で毎日更新する
- 切替は設定値のみ（`DATA_SCOPE=full`）で行う
- 失敗時に壊れたデータをデプロイしない

## データ配置

大容量データは Cloudflare R2 に配置し、公開用JSONはビルド時に生成します。

### R2 オブジェクト命名規約

- `raw/{docType}/{year}/{month}/...`
  - 例: `raw/annual/2026/04/S100XYZ1.tsv`
- `build-input/{scope}/{snapshotDate}/...`
  - 例: `build-input/sample/2026-04-22/manifest.json`
  - 例: `build-input/full/2026-04-22/manifest.json`
- `snapshots/{scope}/{snapshotDate}/public-data.tar.zst`
  - 例: `snapshots/sample/2026-04-22/public-data.tar.zst`

### 推奨メタデータキー

- `x-scope`: `sample` or `full`
- `x-source`: `edinet`
- `x-generated-at`: ISO8601 timestamp
- `x-run-id`: GitHub Actions run id

## 日次パイプライン

Workflow: `.github/workflows/daily-refresh.yml`

1. 依存関係セットアップ（uv + node）
2. D1 export をローカルSQLiteへ復元（`data_source=d1|hybrid` 時）
3. `uv run python scripts/pipeline/ingest_daily_edinet_to_db.py` 実行し、日次差分をローカルDBへUPSERT
4. 差分SQLを remote D1 へ適用
5. `npm run generate-data` 実行（`DATA_SCOPE=sample|full`, `DATA_SOURCE=dataset|d1|hybrid`）
6. 品質ゲート（`company_metrics.json` / `companies.json` / `summaries/*.json` の存在・件数・必須銘柄）
7. テストビルド（`npm run build:app`）
8. 生成結果を `edinet-screener/public/data` に commit/push
9. Cloudflare Git integration により自動デプロイ

## sample -> full 切替手順

1. 手動実行で `data_scope=full` を指定
2. 連続運転と表示確認を行う
3. 問題なければ Cloudflare 側で production branch へ反映
4. 安定後、必要なら scheduled 側の既定 scope を `full` に変更

## 必要な GitHub Secrets

- `EDINET_API_KEY`
- `DATA_SET_URL` (任意、R2/外部URLから data-set を取得する場合)

## Cloudflare 環境分離（dev / staging / prod）

- `edinet-screener/wrangler.jsonc` に `EDINET_DB` (D1) と `EDINET_RAW_BUCKET` (R2) を環境別で定義
- 初回は D1 スキーマを適用:
  - `cd edinet-screener && npm run d1:apply-schema:staging`
  - `cd edinet-screener && npm run d1:apply-schema:production`

## D1 本番運用ルール

- 初回は `cd edinet-screener && npm run d1:seed:production` で `edinet-wrapper/data` を remote D1 に投入する
- 日次更新では remote D1 をローカルSQLiteへ復元してから EDINET API の差分を取り込み、差分SQLを remote D1 に反映する
- `public/data` は日次提出分だけではなく D1 全体から生成する
- D1 取り込み後に `check_daily_delta.py` と `validate_public_data.py` を実行し、件数急減や必須銘柄欠落を失敗扱いにする
- 配信前ゲート:
  - D1取り込み成功
  - remote D1への差分反映成功
  - JSON生成成功
  - 必須銘柄・件数整合性チェック成功
  - フロントビルド成功
  - 上記を満たす場合のみ commit/push

## 運用ルール

- 失敗時はデプロイしない（前回配信を維持）
- sample 運用中も同じワークフローを使う
- 週1回は full で staging 検証を実行し、差分不整合を検知する
