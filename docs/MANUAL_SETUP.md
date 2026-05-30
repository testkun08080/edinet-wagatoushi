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
3. `infra/init/seed-local-d1.sql` でサンプル企業データを upsert

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
```

Web: http://localhost:3000/screener でサンプル企業が表示されれば OK です。

## 6. （任意）Python wrapper

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
| スクリーナーが空 | `bash infra/init/prepare-local-d1.sh` を実行したか |
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
