# @edinet/web

Vike + React on Cloudflare Workers. UI for the EDINET financial screener.

Data is fetched from `@edinet/api` via `hono/client` in `lib/api.ts`.

## Dev

```bash
pnpm --filter @edinet/web dev
# http://localhost:3000
```

`PUBLIC_ENV__API_URL` points at the API Worker; defaults to `http://localhost:8787`.

## Deploy

```bash
bash ../../infra/setup-fork.sh    # one-time: render wrangler.jsonc from template
pnpm --filter @edinet/web deploy:staging
```
