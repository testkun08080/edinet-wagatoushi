# syntax=docker/dockerfile:1.7

## ─── base ────────────────────────────────────────────────────────────
FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

## ─── dev (used by infra/compose.yml) ─────────────────────────────────
FROM base AS dev
COPY package.json ./
EXPOSE 3000
CMD ["pnpm", "dev", "--host", "0.0.0.0"]

## ─── builder ────────────────────────────────────────────────────────
FROM base AS builder
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/web ./apps/web
COPY apps/api ./apps/api
RUN pnpm install --frozen-lockfile --filter @edinet/web... \
    && pnpm --filter @edinet/web build:app

## ─── production smoke ───────────────────────────────────────────────
FROM base AS production
COPY --from=builder /app /app
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["pnpm", "preview", "--host", "0.0.0.0"]
