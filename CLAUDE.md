# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## プロジェクト概要

EDINET から有価証券報告書を取得・解析し、Web スクリーナーで可視化する財務データプラットフォーム。Cloudflare Workers で動作する。

## アーキテクチャ

```
EDINET API
  → apps/wrapper (Python: 取得・解析・指標計算)
  → Cloudflare D1
  → apps/api (Hono on Workers: REST API)
  → apps/web (Vike + React on Workers: UI)
```

## モノレポ構成

```
apps/
  api/        Hono on Workers
  web/        Vike + React on Workers
  wrapper/    Python (uv 管理、pnpm workspace 外)
packages/
  db/         drizzle schema + 共通クエリ
  types/      API/Web 共通 TS 型
infra/
  compose.yml         ローカル開発
  compose.prod.yml    本番相当スモーク
  init/               サンプル DB 取得スクリプト
  setup-fork.sh       フォーク利用者用ワンショット
```

## 開発コマンド

```bash
pnpm install
pnpm turbo typecheck
pnpm turbo test
pnpm dev                                # 全 apps 並列起動

docker compose -f infra/compose.yml up  # API + Web + サンプル DB

cd apps/wrapper && uv sync && uv run pytest
```

## 主要技術

| 層 | 採用 |
|---|---|
| パッケージマネージャ | pnpm |
| ビルド | Turborepo |
| Lint/Format | Biome (TS) / Ruff (Py) |
| ORM | drizzle |
| API | Hono on Cloudflare Workers |
| UI | Vike + React + shadcn/ui |
| DB | Cloudflare D1 |
| pre-commit | lefthook |

## API エンドポイント

| Method | Path |
|---|---|
| GET | `/api/health` |
| GET | `/api/companies` |
| GET | `/api/companies/:secCode` |
| GET | `/api/summaries/:secCode` |
| GET | `/api/metrics` |
| GET | `/api/search?q=` |
| GET | `/api/shareholders/:secCode` |
| GET | `/api/manifest` |

型は `apps/api/src/index.ts` の `export type AppType = typeof app;` を `apps/web/lib/api.ts` の `hc<AppType>` で参照する。

## グローバル状態 (apps/web)

- `ColumnVisibilityContext` — テーブルカラム表示切替
- `FavoritesContext` — お気に入り (localStorage)
- `FilterContext` — フィルタ状態
- `RecentCompaniesContext` — 閲覧履歴

## デプロイ

- `ci.yml` — PR / push 時に lint + typecheck + test
- `deploy.yml` — main push で staging/production 自動デプロイ
- `daily-refresh.yml` — 日次 EDINET 取り込み → D1 → R2 snapshot
- `release.yml` — changesets による version bump とタグ付け

フォーク利用者は `bash infra/setup-fork.sh` 一発で D1 / KV / R2 を作成し `wrangler.toml` / `wrangler.jsonc` を template から生成できる。
