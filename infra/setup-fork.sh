#!/usr/bin/env bash
## Bootstrap for fork users: Cloudflare resources, wrangler configs, API auth secrets.
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

bold() { printf "\033[1m%s\033[0m\n" "$1"; }
green() { printf "\033[32m%s\033[0m\n" "$1"; }
yellow() { printf "\033[33m%s\033[0m\n" "$1"; }
red() { printf "\033[31m%s\033[0m\n" "$1"; }

worker_url() {
  local name="$1"
  local subdomain="$2"
  echo "https://${name}.${subdomain}.workers.dev"
}

get_d1_id() {
  local db_name="$1"
  npx wrangler d1 list 2>/dev/null | awk -v name="$db_name" '$0 ~ name { print $1 }' | head -1
}

create_or_get_d1() {
  local db_name="$1"
  local existing
  existing=$(get_d1_id "$db_name")
  if [ -n "$existing" ]; then
    yellow "  D1 $db_name already exists: $existing"
    echo "$existing"
    return
  fi
  local out
  out=$(npx wrangler d1 create "$db_name" 2>&1)
  local id
  id=$(echo "$out" | awk -F\" '/database_id/ {print $4}')
  if [ -z "$id" ]; then
    red "Failed to create D1 $db_name:"
    echo "$out"
    exit 1
  fi
  green "  Created D1 $db_name: $id"
  echo "$id"
}

get_kv_id() {
  local config_path="$1"
  local env_name="$2"
  npx wrangler kv namespace list --config "$config_path" --env "$env_name" 2>/dev/null \
    | awk -F\" '/"title": "EDINET_CACHE"/ { getline; print $4 }' | head -1
}

create_or_get_kv() {
  local config_path="$1"
  local env_name="$2"
  local existing
  existing=$(get_kv_id "$config_path" "$env_name")
  if [ -n "$existing" ]; then
    yellow "  KV EDINET_CACHE ($env_name) already exists: $existing"
    echo "$existing"
    return
  fi
  local out
  out=$(npx wrangler kv namespace create EDINET_CACHE --config "$config_path" --env "$env_name" 2>&1)
  local id
  id=$(echo "$out" | awk -F\" '/"id":/ {print $4}' | head -1)
  if [ -z "$id" ]; then
    id=$(echo "$out" | awk -F\" '/id/ {print $4}' | head -1)
  fi
  if [ -z "$id" ]; then
    red "Failed to create KV for $env_name:"
    echo "$out"
    exit 1
  fi
  green "  Created KV EDINET_CACHE ($env_name): $id"
  echo "$id"
}

bold "▶ wrangler whoami"
if ! npx wrangler whoami >/dev/null 2>&1; then
  red "wrangler is not logged in. Run: npx wrangler login"
  exit 1
fi
npx wrangler whoami

WORKERS_SUBDOMAIN="${WORKERS_SUBDOMAIN:-}"
if [ -z "$WORKERS_SUBDOMAIN" ]; then
  yellow "Enter your Cloudflare workers.dev subdomain (the part before .workers.dev)."
  yellow "Example: if your Worker URL is https://my-worker.acme.workers.dev, enter acme"
  read -r -p "workers.dev subdomain: " WORKERS_SUBDOMAIN
fi
if [ -z "$WORKERS_SUBDOMAIN" ]; then
  red "WORKERS_SUBDOMAIN is required. Re-run with: WORKERS_SUBDOMAIN=your-subdomain bash infra/setup-fork.sh"
  exit 1
fi

STAGING_API_URL=$(worker_url "edinet-api-staging" "$WORKERS_SUBDOMAIN")
PROD_API_URL=$(worker_url "edinet-api" "$WORKERS_SUBDOMAIN")
STAGING_WEB_URL=$(worker_url "edinet-web-staging" "$WORKERS_SUBDOMAIN")
PROD_WEB_URL=$(worker_url "edinet-web" "$WORKERS_SUBDOMAIN")

bold "▶ Worker URLs (verify after first deploy in Cloudflare dashboard)"
echo "  staging api: $STAGING_API_URL"
echo "  staging web: $STAGING_WEB_URL"
echo "  production api: $PROD_API_URL"
echo "  production web: $PROD_WEB_URL"

bold "▶ Create D1 databases (staging + production)"
cd "$repo_root/apps/api"
staging_id=$(create_or_get_d1 "edinet-staging")
prod_id=$(create_or_get_d1 "edinet-production")
cd "$repo_root"

bold "▶ Render wrangler configs (placeholder pass for KV creation)"
STAGING_D1_ID="$staging_id" PROD_D1_ID="$prod_id" \
STAGING_KV_ID="00000000-0000-0000-0000-000000000001" PROD_KV_ID="00000000-0000-0000-0000-000000000002" \
STAGING_API_URL="$STAGING_API_URL" PROD_API_URL="$PROD_API_URL" \
STAGING_WEB_URL="$STAGING_WEB_URL" PROD_WEB_URL="$PROD_WEB_URL" \
  bash "$repo_root/infra/render-wrangler-config.sh"

bold "▶ Create KV namespaces"
cd "$repo_root/apps/api"
staging_kv=$(create_or_get_kv "wrangler.toml" "staging")
prod_kv=$(create_or_get_kv "wrangler.toml" "production")
cd "$repo_root"

bold "▶ Create R2 bucket (optional, ignore error if exists)"
npx wrangler r2 bucket create edinet-data 2>/dev/null || yellow "  R2 bucket edinet-data may already exist"

bold "▶ Render wrangler configs (final)"
STAGING_D1_ID="$staging_id" PROD_D1_ID="$prod_id" \
STAGING_KV_ID="$staging_kv" PROD_KV_ID="$prod_kv" \
STAGING_API_URL="$STAGING_API_URL" PROD_API_URL="$PROD_API_URL" \
STAGING_WEB_URL="$STAGING_WEB_URL" PROD_WEB_URL="$PROD_WEB_URL" \
  bash "$repo_root/infra/render-wrangler-config.sh"

bold "▶ Apply schema to D1 (staging + production)"
pnpm --filter @edinet/api db:migrate:staging || true
pnpm --filter @edinet/api db:migrate:production || true

bold "▶ GitHub repository secrets (for CI deploy)"
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  yellow "  Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID if not already set:"
  yellow "    gh secret set CLOUDFLARE_API_TOKEN"
  yellow "    gh secret set CLOUDFLARE_ACCOUNT_ID"
  yellow "  Set EDINET_API_KEY for daily-refresh: gh secret set EDINET_API_KEY"
  gh secret set D1_STAGING_ID --body "$staging_id"
  gh secret set D1_PRODUCTION_ID --body "$prod_id"
  gh secret set KV_STAGING_ID --body "$staging_kv"
  gh secret set KV_PRODUCTION_ID --body "$prod_kv"
  gh secret set WORKERS_SUBDOMAIN --body "$WORKERS_SUBDOMAIN"
  green "  GitHub secrets updated (D1/KV/subdomain). Set INTERNAL_API_KEY yourself — see docs/FORK.md"
else
  yellow "  gh CLI not available — set secrets manually (see docs/FORK.md)"
fi

bold "✅ Cloudflare resources and wrangler configs are ready"
cat <<EOF

Next — set INTERNAL_API_KEY yourself (api and web must share the same value):

  # 1) Create your secret file (never commit .internal-api-key)
  cp .internal-api-key.example .internal-api-key
  \$EDITOR .internal-api-key

  # 2) Upload to Cloudflare Workers
  bash infra/apply-internal-api-key.sh

  # 3) Deploy
  git push

  # 4) Verify
  open $STAGING_WEB_URL

Local dev uses sample key from .dev.vars.example (dev-local-key):
  cp apps/api/.dev.vars.example apps/api/.dev.vars
  cp apps/web/.dev.vars.example apps/web/.dev.vars
  docker compose -f infra/compose.yml up

Full guide: docs/FORK.md

EOF
