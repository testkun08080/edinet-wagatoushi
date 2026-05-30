# infra — ローカル開発・デプロイ補助

Docker Compose スタックとフォーク利用者向けセットアップ。Docker なしの手動セットアップは [MANUAL_SETUP.md](../MANUAL_SETUP.md)。

## ファイル構成

```
infra/
├── compose.yml              dev: db-init + api + web (+ wrapper profile=ingest)
├── compose.prod.yml         本番相当イメージのスモークテスト
├── init/
│   └── fetch-sample-data.sh  GH Release からサンプル SQLite を取得
└── setup-fork.sh            D1/KV/R2 作成 + wrangler 設定生成 + Secrets
```

## compose.yml（開発）

```bash
mkdir -p data          # ボリュームマウント先（gitignore 済）
docker compose -f infra/compose.yml up
# → web  http://localhost:3000
# → api  http://localhost:8787
```

| service | 役割 |
|---|---|
| `db-init` | 初回のみ GH Release からサンプル `edinet.db` を `data/` へ展開 |
| `api` | `apps/api` を dev ターゲットでビルド、`pnpm dev` (wrangler) |
| `web` | `apps/web` を dev ターゲット。`.dev.vars` で `API_UPSTREAM_URL=http://api:8787` にプロキシ |
| `wrapper` | `profiles: [ingest]`。通常は起動せず手動取り込み用 |

```bash
# EDINET 取り込みを手動実行
docker compose -f infra/compose.yml --profile ingest run wrapper
```

各 Dockerfile は `dev` / `builder` / `production` のマルチステージ。compose.yml は `target: dev`、compose.prod.yml は `target: production`。

## setup-fork.sh（フォーク利用者）

```bash
npx wrangler login
bash infra/setup-fork.sh
```

実行内容:
1. `wrangler whoami` で認証確認
2. D1 (`edinet-staging` / `edinet-production`) 作成
3. KV (`EDINET_CACHE`) 作成
4. R2 (`edinet-data`) 作成
5. `apps/api/wrangler.toml` と `apps/web/wrangler.jsonc` をテンプレートから生成（ID 注入）
6. `pnpm db:migrate:*` でスキーマ適用
7. GitHub Secrets / Variables を `gh` でセット（下表）

| 種類 | 名前 |
|---|---|
| Secret | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `EDINET_API_KEY` |
| Secret | `D1_STAGING_ID`, `D1_PRODUCTION_ID`, `KV_STAGING_ID`, `KV_PRODUCTION_ID`, `WORKERS_SUBDOMAIN`, `INTERNAL_API_KEY` |

フォーク利用者向けの詳細は [FORK.md](../FORK.md)。

| スクリプト | 用途 |
|---|---|
| `infra/setup-fork.sh` | D1/KV、wrangler 設定（**API キーは作らない**） |
| `infra/apply-internal-api-key.sh` | `.internal-api-key` を Cloudflare secret に登録 |
| `.internal-api-key.example` | 本番用キーのサンプル（プレースホルダ） |

## fetch-sample-data.sh

GH Release の `sample-edinet.db.gz` を取得して `data/edinet.db` に展開。
`SAMPLE_DB_SHA256` env を渡すと整合性チェック、`SAMPLE_DB_URL` で取得元を上書き可。
ダウンロード失敗時は空 DB を置いて API が起動できるようにする。

## wrangler 設定の扱い

- `*.template` のみ git 管理（placeholder 入り）
- 実体 `wrangler.toml` / `wrangler.jsonc` は `.gitignore`（公式 ID 誤コミット防止）
