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
  echo "[prepare-local-d1] schema already present, skipping 0000_init"
fi

if ! pnpm exec wrangler d1 execute edinet-local --local --command "SELECT 1 FROM company_metrics LIMIT 1" >/dev/null 2>&1; then
  echo "[prepare-local-d1] applying migration packages/db/migrations/0001_company_metrics.sql"
  pnpm exec wrangler d1 execute edinet-local --local --file "$REPO_ROOT/packages/db/migrations/0001_company_metrics.sql"
else
  echo "[prepare-local-d1] company_metrics table already present, skipping 0001"
fi

echo "[prepare-local-d1] applying sample seed"
pnpm exec wrangler d1 execute edinet-local --local --file "$REPO_ROOT/infra/init/seed-local-d1.sql"

echo "[prepare-local-d1] rebuilding company_metrics from local D1 (11 sample companies)"
pnpm exec wrangler d1 export edinet-local --local --output /tmp/edinet-local-export.sql
rm -f /tmp/edinet-local-corpus.db
sqlite3 /tmp/edinet-local-corpus.db < /tmp/edinet-local-export.sql
METRICS_LIMIT_ARGS=""
if [ -n "${LIMIT:-}" ]; then
  METRICS_LIMIT_ARGS="--limit $LIMIT"
fi
pnpm --filter @edinet/metrics exec tsx "$REPO_ROOT/infra/init/build-company-metrics.mjs" \
  /tmp/edinet-local-corpus.db "$REPO_ROOT/infra/init/company_metrics.sql" $METRICS_LIMIT_ARGS
pnpm exec wrangler d1 execute edinet-local --local --file "$REPO_ROOT/infra/init/company_metrics.sql"

if [ -d "$REPO_ROOT/apps/web/public/data/shareholders" ]; then
  echo "[prepare-local-d1] applying shareholder_snapshots from sample JSON"
  pnpm --filter @edinet/metrics exec tsx "$REPO_ROOT/infra/init/build-shareholder-snapshots.mjs" \
    "$REPO_ROOT/apps/web/public/data/shareholders" "$REPO_ROOT/infra/init/shareholder_snapshots.sql"
  pnpm exec wrangler d1 execute edinet-local --local --file "$REPO_ROOT/infra/init/shareholder_snapshots.sql"
fi

echo "[prepare-local-d1] done"
