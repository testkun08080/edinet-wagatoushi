# edinet-wagatoushi

[![ci](https://github.com/testkun08080/edinet-wagatoushi/actions/workflows/ci.yml/badge.svg)](https://github.com/testkun08080/edinet-wagatoushi/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

EDINET から有価証券報告書を取得・解析し、Web スクリーナーで可視化する **オープンソース** の財務データプラットフォーム。Cloudflare Workers の無料枠で動作する。

## 30 分でフォークから自分のデプロイまで

```bash
# 1. fork & clone (5 min)
gh repo fork <owner>/edinet-wagatoushi --clone
cd edinet-wagatoushi

# 2. ローカルでサンプル UI を確認 (5 min)
docker compose -f infra/compose.yml up
# → http://localhost:3000

# 3. 自分の Cloudflare アカウントへセットアップ (10 min)
pnpm install
npx wrangler login
bash infra/setup-fork.sh
cp .internal-api-key.example .internal-api-key   # 編集して自分の秘密に
bash infra/apply-internal-api-key.sh             # Cloudflare に登録

# 4. push → GitHub Actions が自動デプロイ (10 min)
git push
# → https://edinet-api-staging.<your-subdomain>.workers.dev
# → https://edinet-web-staging.<your-subdomain>.workers.dev
```

## アーキテクチャ

```
EDINET API
  ↓
apps/wrapper (Python: 取得・解析・指標計算)
  ↓ SQLite delta
Cloudflare D1
  ↓ drizzle
apps/api (Hono on Workers)
  ↓ hono/client (型安全)
apps/web (Vike + React on Workers)
  ↓
ユーザー
```

## モノレポ構成

```
apps/
  api/        Hono on Workers (REST API)
  web/        Vike + React on Workers (UI)
  wrapper/    Python: EDINET 取得・解析
packages/
  db/         drizzle schema + 共通クエリ
  types/      API/Web 共通 TS 型
infra/
  compose.yml         ローカル開発
  compose.prod.yml    本番相当スモーク
  setup-fork.sh       フォーク利用者向けワンショット
docs/
  MIGRATION.md        旧構造からの移行マップ
```

## 開発コマンド

```bash
pnpm dev                       # 全 apps を並列起動 (turbo)
pnpm lint                      # biome check
pnpm typecheck                 # 全 workspace で tsc --noEmit
pnpm test                      # turbo test
pnpm changeset                 # changeset 作成
```

Python:

```bash
cd apps/wrapper
uv sync
uv run pytest
uv run python scripts/ingest_daily.py --help
```

## 環境変数

| 変数名 | 用途 | 必要箇所 |
|---|---|---|
| `EDINET_API_KEY` | EDINET API キー | wrapper |
| `CLOUDFLARE_API_TOKEN` | Workers / D1 デプロイ | CI |
| `CLOUDFLARE_ACCOUNT_ID` | 同上 | CI |
| `INTERNAL_API_KEY` | API 認証（web BFF → api） | 自分で設定（[docs/FORK.md](./docs/FORK.md)） |
| `API_UPSTREAM_URL` | web がプロキシする API の URL | web Worker vars（setup-fork がアカウント URL で生成） |
| `WORKERS_SUBDOMAIN` | workers.dev のサブドメイン | GitHub Secret（CI デプロイ用） |
| `PUBLIC_ENV__SENTRY_DSN` | Sentry DSN (任意) | web |

## ドキュメント

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — 全体構造・依存グラフ・データフロー
- [docs/modules/](./docs/modules/) — モジュール別ドキュメント (api / web / wrapper / db / types / infra)
- [docs/FORK.md](./docs/FORK.md) — フォーク利用者向けセットアップ・セキュリティ
- [docs/MIGRATION.md](./docs/MIGRATION.md) — 旧構造から現在の構造への移行マップ
- [CONTRIBUTING.md](./CONTRIBUTING.md) — 開発フロー
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- [SECURITY.md](./SECURITY.md) — 脆弱性報告

## ライセンス

[MIT](./LICENSE)

## クレジット

- 財務データ: [EDINET](https://disclosure2.edinet-fsa.go.jp/) (金融庁)
- ホスティング: [Cloudflare Workers](https://workers.cloudflare.com/)
