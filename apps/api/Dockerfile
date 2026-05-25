# syntax=docker/dockerfile:1.7

## ─── base ────────────────────────────────────────────────────────────
FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

## ─── dev (used by infra/compose.yml) ─────────────────────────────────
## Source tree is bind-mounted at runtime, so we only pre-warm pnpm.
FROM base AS dev
COPY package.json ./
EXPOSE 8787
CMD ["pnpm", "dev"]

## ─── builder (production deps + wrangler dry-run) ────────────────────
FROM base AS builder
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile --filter @edinet/api... \
    && pnpm --filter @edinet/api build

## ─── production smoke (used by infra/compose.prod.yml) ───────────────
## In real prod the Worker is deployed to Cloudflare; this image just
## lets CI run wrangler dev against the built bundle.
FROM base AS production
COPY --from=builder /app /app
WORKDIR /app/apps/api
EXPOSE 8787
CMD ["pnpm", "exec", "wrangler", "dev", "--port", "8787"]
