# edinet-wagatoushi

[![ci](https://github.com/testkun08080/edinet-wagatoushi/actions/workflows/ci.yml/badge.svg)](https://github.com/testkun08080/edinet-wagatoushi/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

EDINET から有価証券報告書を取得・解析し、Web スクリーナーで可視化する **オープンソース** の財務データプラットフォーム。Cloudflare Workers の無料枠で動作します。

> 🚧 **v2 移行中**: モノレポ + Hono API on Workers への全面再設計を進行中です。詳細は [docs/V2_REDESIGN_PLAN.md](./docs/V2_REDESIGN_PLAN.md) を参照。v1 (静的 JSON パイプライン) も並走しています ([docs/LEGACY_README.md](./docs/LEGACY_README.md))。

## 30 分でフォークから自分のデプロイまで

```bash
# 1. fork & clone (5 min)
gh repo fork testkun08080/edinet-wagatoushi --clone
cd edinet-wagatoushi

# 2. ローカルでサンプル UI を確認 (5 min)
docker compose -f infra/compose.yml up
# → http://localhost:3000

# 3. 自分の Cloudflare アカウントへセットアップ (10 min)
pnpm install
npx wrangler login
bash infra/setup-fork.sh        # D1 + KV + R2 を自動作成 + wrangler.toml 生成

# 4. GitHub Secrets 設定 (5 min)
gh secret set CLOUDFLARE_API_TOKEN
gh secret set CLOUDFLARE_ACCOUNT_ID
gh secret set EDINET_API_KEY

# 5. push → GitHub Actions が自動デプロイ (5 min)
git add apps/api/wrangler.toml
git commit -m "chore: setup my fork"
git push
# → https://edinet-api-<account>.workers.dev
# → https://edinet-web-<account>.workers.dev
```

## アーキテクチャ

```
EDINET API
  ↓
apps/wrapper (Python: 取得・解析・指標計算)
  ↓ SQLite delta
Cloudflare D1
  ↓ drizzle
apps/api (Hono on Workers: REST API)
  ↓ hono/client (type-safe)
apps/web (Vike + React on Workers: UI)
  ↓
ユーザー (https://...workers.dev)
```

詳細は [docs/V2_REDESIGN_PLAN.md §12](./docs/V2_REDESIGN_PLAN.md) のレイヤード図を参照。

## モノレポ構成

```
edinet-wagatoushi/
├── apps/
│   ├── api/        # Hono on Workers (REST API)
│   ├── web/        # Vike + React on Workers (UI)
│   └── wrapper/    # Python: EDINET 取得・解析
├── packages/
│   ├── db/         # drizzle schema + 共通クエリ
│   └── types/      # API / Web 共通 TS 型
├── infra/
│   ├── compose.yml         # ローカル開発 (api + web + sqlite)
│   ├── compose.prod.yml    # 本番相当スモーク
│   ├── init/               # サンプルデータ取得スクリプト
│   └── setup-fork.sh       # フォーク利用者向けワンショット
├── docs/           # 設計ドキュメント
└── .github/workflows/
    ├── ci.yml              # lint + typecheck + test
    ├── deploy-v2.yml       # api + web デプロイ
    ├── daily-refresh-v2.yml  # 日次 EDINET 取り込み
    └── release.yml         # changesets リリース
```

## 開発コマンド

```bash
pnpm dev                       # 全 apps を並列起動 (turbo)
pnpm lint                      # biome check
pnpm typecheck                 # 全 workspace で tsc --noEmit
pnpm test                      # turbo test
pnpm changeset                 # changeset を作成
```

Python 側:

```bash
cd apps/wrapper
uv sync
uv run pytest
uv run python scripts/ingest_daily.py --help
```

## 環境変数

| 変数名 | 用途 | 必須 |
|---|---|---|
| `EDINET_API_KEY` | EDINET API キー | wrapper のみ |
| `CLOUDFLARE_API_TOKEN` | Workers / D1 デプロイ | CI のみ |
| `CLOUDFLARE_ACCOUNT_ID` | 同上 | CI のみ |
| `PUBLIC_ENV__API_URL` | apps/web から見た API URL | web ビルド時 |
| `PUBLIC_ENV__SENTRY_DSN` | Sentry DSN (任意) | |

## ドキュメント

### 設計

- [V2 再設計プラン](./docs/V2_REDESIGN_PLAN.md) — モノレポ + Hono API on Workers の全体図
- [プロジェクトフロー](./docs/PROJECT_FLOW.md)
- [データパイプラインと指標計算](./docs/DATA_PIPELINE_AND_CALCULATIONS.md)
- [EDINET 指標の分類](./docs/EDINET_METRICS_CLASSIFICATION.md)
- [D1 ハイブリッド運用](./docs/D1_HYBRID_OPERATIONS.md)

### 運用

- [デプロイパイプライン](./docs/DEPLOY_PIPELINE.md)
- [GitHub Actions セットアップ](./docs/GITHUB_ACTIONS_SETUP.md)
- [本番 D1 日次チェックリスト](./docs/PRODUCTION_D1_DAILY_CHECKLIST.md)

### v1 (静的 JSON パイプライン)

- [v1 README](./docs/LEGACY_README.md) — Cloudflare 連携前の運用手順

## コントリビュート

- [CONTRIBUTING.md](./CONTRIBUTING.md) — 開発フロー
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- [SECURITY.md](./SECURITY.md) — 脆弱性報告

## ライセンス

[MIT](./LICENSE)

## クレジット

- 財務データソース: [EDINET](https://disclosure2.edinet-fsa.go.jp/) (金融庁)
- ホスティング: [Cloudflare Workers](https://workers.cloudflare.com/) (無料枠)
