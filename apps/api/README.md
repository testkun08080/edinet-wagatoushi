# @edinet/api

Hono on Cloudflare Workers. Reads from D1 via drizzle, returns JSON to `apps/web`.

## Local dev

```bash
# 1. Copy template and fill in D1 ids (or let infra/setup-fork.sh do it)
cp wrangler.toml.template wrangler.toml

# 2. Start with local SQLite (miniflare)
pnpm --filter @edinet/api dev
# → http://localhost:8787/api/health
```

## Endpoints

| Method | Path                          | Description                                |
|--------|-------------------------------|--------------------------------------------|
| GET    | `/api/health`                 | Health check                               |
| GET    | `/api/companies`              | Company list with pagination               |
| GET    | `/api/companies/:secCode`     | Company detail (secCode or edinetCode)     |
| GET    | `/api/summaries/:secCode`     | Time-series financial summary              |
| GET    | `/api/metrics`                | Latest snapshot for the screener table     |
| GET    | `/api/search?q=`              | Full-text search across name / secCode     |
| GET    | `/api/shareholders/:secCode`  | Major shareholders                         |
| GET    | `/api/manifest`               | Column manifest (UI metadata)              |

## Type sharing with web

```ts
// apps/web/lib/api.ts
import { hc } from "hono/client";
import type { AppType } from "@edinet/api";

export const api = hc<AppType>(""); // web BFF same-origin proxy
```
