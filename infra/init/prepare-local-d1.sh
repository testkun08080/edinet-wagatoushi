#!/bin/sh
## Apply schema + sample seed to wrangler's local D1 (edinet-local).
## Idempotent: schema runs only when companies table is missing; seed always upserts.
## Works from repo root on the host or inside Docker (/workspace mount).
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)

cd "$REPO_ROOT/apps/api"

# wrangler only loads D1 bindings from wrangler.toml / wrangler.jsonc (not *.template).
cp -f wrangler.toml.template wrangler.toml

if ! pnpm exec wrangler d1 execute edinet-local --local --command "SELECT 1 FROM companies LIMIT 1" >/dev/null 2>&1; then
  echo "[prepare-local-d1] applying schema from packages/db/migrations/0000_init.sql"
  pnpm exec wrangler d1 execute edinet-local --local --file "$REPO_ROOT/packages/db/migrations/0000_init.sql"
else
  echo "[prepare-local-d1] schema already present, skipping migration"
fi

echo "[prepare-local-d1] applying sample seed"
pnpm exec wrangler d1 execute edinet-local --local --file "$REPO_ROOT/infra/init/seed-local-d1.sql"
