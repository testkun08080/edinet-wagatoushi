# apps/web — Vike + React on Cloudflare Workers

財務スクリーナーの UI。`@edinet/api` を `hono/client` 経由で型安全に呼ぶ。

パッケージ名: `@edinet/web`

## ファイル構成

```
apps/web/
├── pages/                    Vike ファイルベースルーティング
│   ├── index/+Page.tsx         ランディング
│   ├── screener/+Page.tsx      一覧テーブル
│   ├── screener/analyze/@secCode/+Page.tsx  企業詳細
│   ├── analyze/@secCode/+Page.tsx
│   ├── contact / privacy / _error
│   ├── +Layout.tsx / +Head.tsx / +config.ts  全ページ共通
│   └── +client.ts / +onPageTransition*.ts
├── components/
│   ├── CompanyTable.tsx        一覧表（loadCompanyMetrics で取得）
│   ├── SummaryCharts.tsx       時系列チャート (recharts)
│   ├── CompanySidebar.tsx / PresetScreeners.tsx / ...
│   ├── MajorShareholdersTimeSeries.tsx
│   ├── *Context.tsx            グローバル状態（下記）
│   └── ui/                     shadcn/ui プリミティブ
├── lib/
│   ├── api.ts                  hc<AppType>(apiBaseUrl) クライアント
│   ├── metricsLoader.ts        /api/metrics を叩く薄いラッパ
│   ├── metricFormat.ts         円→百万円・比率→% などの表示換算
│   ├── routes.ts               analyzePath などの URL ヘルパ
│   ├── analytics.ts            Google Analytics
│   ├── parse-major-shareholders.ts / financial-pickers.ts / ...
│   └── landing/                LP 用デモデータ
├── assets/                     logo
├── wrangler.jsonc.template     D1 binding の placeholder
└── Dockerfile                  dev / builder / production
```

## グローバル状態 (React Context)

| Context | 役割 | 永続化 |
|---|---|---|
| `FilterContext` | スクリーナーのフィルタ条件 | — |
| `FavoritesContext` | お気に入り企業 | localStorage |
| `ColumnVisibilityContext` | 表示カラムの切替 | localStorage |
| `RecentCompaniesContext` | 閲覧履歴 | localStorage |

## API 連携

```ts
// lib/api.ts
import { hc } from "hono/client";
import type { AppType } from "@edinet/api";
export const api = hc<AppType>("");  // same-origin → server/api-proxy → upstream API

// lib/metricsLoader.ts
const res = await api.api.metrics.$get({ query: { limit: "2000" } });
```

`apps/api` のルート定義が変わると `AppType` 経由でここの型もコンパイル時に追従する。

## 環境変数

| 変数 | 用途 |
|---|---|
| `INTERNAL_API_KEY` | BFF が upstream API に付与する共有キー（`.dev.vars` / secret） |
| `API_UPSTREAM_URL` | プロキシ先 API（ローカル `http://127.0.0.1:8787`、本番は wrangler vars） |
| `PUBLIC_ENV__SENTRY_DSN` | Sentry (任意) |
| `PUBLIC_ENV__GOOGLE_ANALYTICS` | GA 測定 ID (任意) |
| `PUBLIC_ENV__SITE_URL` | OGP / canonical (任意) |

## 起動・ビルド

```bash
pnpm --filter @edinet/web dev          # http://localhost:3000
pnpm --filter @edinet/web build        # generate:ogp + vike build
pnpm --filter @edinet/web typecheck
```

## 注意

- ルーティングは Vike の `pages/**/+Page.tsx` 規約。`@secCode` は動的セグメント。
- OGP 画像はビルド時に `scripts/generate-ogp.tsx` (satori + resvg) が生成する。
- lint は現状 ESLint（v1 由来）。TS 型チェックは `tsc --noEmit`。
