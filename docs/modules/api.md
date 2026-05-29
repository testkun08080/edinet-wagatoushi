# apps/api — Hono on Cloudflare Workers

D1 を drizzle で読み、JSON を返す REST API。`apps/web` から型安全に呼ばれる。

パッケージ名: `@edinet/api`

## ファイル構成

```
apps/api/
├── src/
│   ├── index.ts            Hono app の本体。ミドルウェア → ルート集約 → AppType export
│   ├── env.ts              Bindings (D1/KV/R2) / Variables / DB 型
│   ├── middleware/
│   │   └── db.ts           drizzle(c.env.EDINET_DB) を c.var.db に注入
│   └── routes/
│       ├── health.ts       GET /api/health
│       ├── companies.ts    GET /api/companies, /api/companies/:secCode
│       ├── summaries.ts    GET /api/summaries/:secCode
│       ├── metrics.ts      GET /api/metrics
│       ├── search.ts       GET /api/search?q=
│       ├── shareholders.ts GET /api/shareholders/:secCode
│       └── manifest.ts     GET /api/manifest
├── test/
│   ├── health.test.ts      vitest: app.request() で 4 ルートをスモーク
│   └── types.test-d.ts     型レベル: hc<AppType> が 8 経路を推論できるか
├── wrangler.toml.template  D1/KV/R2 binding の placeholder
├── Dockerfile              dev / builder / production の 3 ステージ
└── vitest.config.ts
```

## エンドポイント

| Method | Path | クエリ/パラメータ | 返却型 (`@edinet/types`) |
|---|---|---|---|
| GET | `/api/health` | — | `HealthResponse` |
| GET | `/api/companies` | `page`, `pageSize`, `industry` | `CompanyListResponse` |
| GET | `/api/companies/:secCode` | secCode or edinetCode | `{ company }` / 404 |
| GET | `/api/summaries/:secCode` | — | `SummaryResponse` / 404 |
| GET | `/api/metrics` | `limit`, `offset` | `MetricsResponse` |
| GET | `/api/search` | `q` (2 文字以上) | `SearchResponse` |
| GET | `/api/shareholders/:secCode` | — | `ShareholdersResponse` |
| GET | `/api/manifest` | — | `ManifestResponse` |

## リクエストの流れ

```
index.ts
  .use(logger, requestId, cors)        全ルート共通
  .use("/api/*", dbMiddleware)         drizzle(D1) を c.var.db へ
  .route("/api/companies", ...)        各ルートを mount
  → routes/companies.ts: getDb(c) → packages/db の queries を呼ぶ
```

## 型共有の要

```ts
// index.ts 末尾
export type AppType = typeof app;
```

`apps/web/lib/api.ts` が `hc<AppType>` で受けることで、ルート追加・シグネチャ変更がコンパイル時に web へ伝播する。`test/types.test-d.ts` がこの推論を担保する。

## ローカル起動

```bash
# health 系だけなら最小 wrangler.toml で起動可能
cp wrangler.toml.template wrangler.toml   # D1 がいるルートはエラー応答になる
pnpm --filter @edinet/api dev             # http://localhost:8787
pnpm --filter @edinet/api test            # vitest
```

## 認証

- `/api/*`（`/api/health` を除く）は `X-Internal-Api-Key` または `Authorization: Bearer` で `INTERNAL_API_KEY` と一致する必要がある。
- ローカル: `apps/api/.dev.vars`（`INTERNAL_API_KEY=dev-local-key`）。本番: `wrangler secret put INTERNAL_API_KEY`。
- ブラウザは web Worker の同一オリジン `/api/*` プロキシ経由のみ（`apps/web/server/`）。

## 注意

- `EDINET_CACHE` (KV), `EDINET_DATA` (R2) は optional binding。未設定でも health は動く。
- D1 binding 未設定時、`/api/companies` などは `onError` で `500 internal_error` を返す（想定動作）。
