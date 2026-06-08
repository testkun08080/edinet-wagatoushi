# 手動ローカルセットアップ（Docker Compose なし）

Docker を使わず、ホスト上で API + Web の開発環境を一から立ち上げる手順です。

Docker Compose でサンプル UI を最速確認する場合は [README](../README.md) の `docker compose -f infra/compose.yml up` を参照してください。Cloudflare へのデプロイは [FORK.md](./FORK.md) を参照してください。

## 前提

| 要件 | 推奨 |
|---|---|
| Node.js | 22+ |
| pnpm | 9.12+（`corepack enable` で有効化可） |
| Cloudflare アカウント | 不要（ローカル dev のみ） |

Python wrapper（EDINET 取り込み）を使う場合は [uv](https://docs.astral.sh/uv/) も必要です。

## 1. 依存関係のインストール

```bash
git clone https://github.com/testkun08080/edinet-wagatoushi.git
cd edinet-wagatoushi
pnpm install
```

## 2. Wrangler 設定と環境変数

テンプレートからローカル用の設定ファイルをコピーします（実体は `.gitignore` 済み）。

```bash
cp apps/api/wrangler.toml.template apps/api/wrangler.toml
cp apps/web/wrangler.jsonc.template apps/web/wrangler.jsonc
cp apps/api/.dev.vars.example apps/api/.dev.vars
cp apps/web/.dev.vars.example apps/web/.dev.vars
```

| ファイル | 内容 |
|---|---|
| `apps/api/.dev.vars` | `INTERNAL_API_KEY=dev-local-key`（開発専用） |
| `apps/web/.dev.vars` | 同上 + `API_UPSTREAM_URL=http://127.0.0.1:8787` |

`INTERNAL_API_KEY` は api と web で **同じ値** にしてください。本番用キーの設定は [FORK.md](./FORK.md) を参照。

## 3. ローカル D1 にサンプルデータを投入

API は Cloudflare D1 のローカルエミュレーション（miniflare）を使います。スキーマとサンプル seed を投入します。

```bash
bash infra/init/prepare-local-d1.sh
```

このスクリプトは次を行います。

1. `wrangler.toml.template` → `wrangler.toml` を api ディレクトリにコピー（未作成の場合）
2. `packages/db/migrations/0000_init.sql` でスキーマ適用（未適用時のみ）
3. `packages/db/migrations/0001_company_metrics.sql` で `company_metrics` / `shareholder_snapshots` テーブル追加（未適用時のみ）
4. `infra/init/seed-local-d1.sql` でサンプル企業データを upsert
5. `build-company-metrics.mjs` で `company_metrics` を再計算しローカル D1 に投入
6. （任意）`build-shareholder-snapshots.mjs` で大株主スナップショットを投入

## 4. 開発サーバー起動

### 両方まとめて起動

```bash
pnpm dev
```

| サービス | URL |
|---|---|
| Web UI | http://localhost:3000 |
| API | http://localhost:8787 |

### 個別に起動

```bash
# ターミナル 1 — API
pnpm --filter @edinet/api dev

# ターミナル 2 — Web
pnpm --filter @edinet/web dev
```

ブラウザからの API 呼び出しは Web Worker の同一オリジン `/api/*` プロキシ経由です（`apps/web/server/api-proxy.ts`）。直接 API を叩く場合は `X-Internal-Api-Key: dev-local-key` ヘッダが必要です（`/api/health` を除く）。

## 5. 動作確認

```bash
# API ヘルス（認証不要）
curl http://127.0.0.1:8787/api/health

# スクリーナー用メトリクス（認証あり）
curl -H "X-Internal-Api-Key: dev-local-key" http://127.0.0.1:8787/api/metrics?limit=5

# 企業検索（認証あり）
curl -H "X-Internal-Api-Key: dev-local-key" "http://127.0.0.1:8787/api/search?q=ライオン"
```

Web: http://localhost:3000/screener でサンプル企業が表示されれば OK です。

`/api/metrics` のレスポンスに `sales` / `ROE` が含まれ、スクリーナー指標列に数値が出ていれば `company_metrics` の投入も成功です。

## 6. リモート D1 への migration と backfill（小規模テスト推奨）

> **重要**: 開発・検証では **本番 D1（例: `edisuku-db` 約 591MB）のフルエクスポートは不要** です。ダウンロードに時間がかかり、ディスクを圧迫します。次のいずれかを使ってください。
>
> | 用途 | 推奨 |
> |---|---|
> | 日常開発 | §3 の `prepare-local-d1.sh`（11 社サンプル + `company_metrics` 自動生成） |
> | リモート検証 | **staging D1**（例: `edisuku-db-staging`）に `--limit 5` などで少数社のみ投入 |
> | 本番反映 | daily-refresh または手動で全件 backfill（本番のみ） |

### 6-1. migration 0001 を適用（staging 推奨）

まず staging で試し、問題なければ production へ進めます。

```bash
cd apps/api

# staging（フォーク例: edisuku-db-staging）
D1_NAME=edisuku-db-staging
pnpm exec wrangler d1 execute "$D1_NAME" --remote --env staging \
  --file ../../packages/db/migrations/0001_company_metrics.sql

# production は検証後のみ（例: edisuku-db）
# D1_NAME=edisuku-db
# pnpm exec wrangler d1 execute "$D1_NAME" --remote --env production \
#   --file ../../packages/db/migrations/0001_company_metrics.sql
```

### 6-2. company_metrics を生成（--limit で少数社）

コーパス SQLite から SQL を生成します。**テスト時は必ず `--limit` を付けてください。**

```bash
# ローカルサンプル DB から（prepare-local-d1.sh 実行後のエクスポートなど）
pnpm --filter @edinet/metrics exec tsx ../../infra/init/build-company-metrics.mjs \
  /tmp/edinet-local-corpus.db ../../infra/init/company_metrics.sql

# リモート staging から少数社のみ（エクスポートは staging のみ、本番は避ける）
cd apps/api
D1_NAME=edisuku-db-staging
pnpm exec wrangler d1 export "$D1_NAME" --remote --env staging --output /tmp/staging-corpus.sql
sqlite3 /tmp/staging-corpus.db < /tmp/staging-corpus.sql
pnpm --filter @edinet/metrics exec tsx ../../infra/init/build-company-metrics.mjs \
  /tmp/staging-corpus.db ../../infra/init/company_metrics.sql --limit 5

# 環境変数でも指定可
LIMIT=10 pnpm db:backfill:metrics -- /tmp/staging-corpus.db ../../infra/init/company_metrics.sql
```

### 6-3. 生成 SQL を D1 に投入

```bash
cd apps/api
D1_NAME=edisuku-db-staging   # テスト時は staging
pnpm exec wrangler d1 execute "$D1_NAME" --remote --env staging \
  --file ../../infra/init/company_metrics.sql
```

投入後、KV キャッシュ（設定済みの場合）を無効化します。

```bash
pnpm exec wrangler kv key delete "screener:metrics:v2" \
  --namespace-id "<KV_STAGING_ID>"
```

### 6-4. 大株主スナップショット（任意）

v1 形式の `apps/web/public/data/shareholders/*.json` がある場合:

```bash
pnpm --filter @edinet/metrics exec tsx ../../infra/init/build-shareholder-snapshots.mjs \
  --limit 5
cd apps/api
pnpm exec wrangler d1 execute "$D1_NAME" --remote --env staging \
  --file ../../infra/init/shareholder_snapshots.sql
```

### 6-5. リモートでスクリーナー確認

```bash
curl -H "X-Internal-Api-Key: <your-key>" \
  "https://<api-host>/api/metrics?limit=5"
```

`rows[0].sales` と `rows[0].ROE` が null でなければ OK です。Web の `/screener` で指標列に数値が表示されます。

日次パイプライン（`.github/workflows/daily-refresh.yml`）は delta 適用後に **全件** rebuild を自動実行します（本番用）。D1 名は GitHub Secret `D1_PRODUCTION_NAME`（未設定時は `edinet-production`）で指定できます。

## 7. （任意）Python wrapper

EDINET からデータを取り込む場合:

```bash
cd apps/wrapper
uv sync
cp .env.example .env   # EDINET_API_KEY を設定
uv run python scripts/ingest_daily.py --help
```

取り込み先の SQLite と D1 への反映フローは [modules/wrapper.md](./modules/wrapper.md) を参照。

## トラブルシュート

| 症状 | 確認・対処 |
|---|---|
| スクリーナーが空 | `bash infra/init/prepare-local-d1.sh` を実行したか。リモート D1 の場合は §6 の backfill 済みか |
| 指標列が空欄 | `company_metrics` テーブルにデータがあるか（`/api/metrics` で `sales` を確認） |
| `proxy_misconfigured` | `apps/web/.dev.vars` に `API_UPSTREAM_URL` と `INTERNAL_API_KEY` があるか |
| API が 401 | api / web の `INTERNAL_API_KEY` が一致しているか |
| D1 関連エラー | `apps/api/wrangler.toml` が存在するか（template からコピー） |
| Web だけ起動して API 未起動 | `API_UPSTREAM_URL=http://127.0.0.1:8787` で api が :8787 で動いているか |

## Docker Compose との違い

| | 手動（このドキュメント） | Docker Compose |
|---|---|---|
| 起動 | `pnpm dev` | `docker compose -f infra/compose.yml up` |
| D1 初期化 | `prepare-local-d1.sh` | api 起動時に自動実行 |
| Node 依存 | ホストに直接インストール | コンテナ内 |
| wrapper 取り込み | ホストで `uv run ...` | `--profile ingest` でコンテナ実行 |

## 関連ドキュメント

- [FORK.md](./FORK.md) — Cloudflare デプロイ・本番 API キー
- [modules/api.md](./modules/api.md) — API エンドポイント詳細
- [modules/web.md](./modules/web.md) — Web 環境変数・ビルド
- [modules/infra.md](./modules/infra.md) — Docker Compose・setup-fork.sh
