#!/usr/bin/env bash
## Substitute placeholders in wrangler templates (setup-fork.sh and deploy.yml).
## Required env:
##   STAGING_D1_ID, PROD_D1_ID, STAGING_KV_ID, PROD_KV_ID
##   STAGING_API_URL, PROD_API_URL, STAGING_WEB_URL, PROD_WEB_URL
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"

required=(
  STAGING_D1_ID PROD_D1_ID STAGING_KV_ID PROD_KV_ID
  STAGING_API_URL PROD_API_URL STAGING_WEB_URL PROD_WEB_URL
)
for v in "${required[@]}"; do
  if [ -z "${!v:-}" ]; then
    echo "[render-wrangler-config] missing env: $v" >&2
    exit 1
  fi
done

escape_sed() {
  printf '%s' "$1" | sed -e 's/[&/\]/\\&/g'
}

S_STAGING_D1_ID=$(escape_sed "$STAGING_D1_ID")
S_PROD_D1_ID=$(escape_sed "$PROD_D1_ID")
S_STAGING_KV_ID=$(escape_sed "$STAGING_KV_ID")
S_PROD_KV_ID=$(escape_sed "$PROD_KV_ID")
S_STAGING_API_URL=$(escape_sed "$STAGING_API_URL")
S_PROD_API_URL=$(escape_sed "$PROD_API_URL")
S_STAGING_WEB_URL=$(escape_sed "$STAGING_WEB_URL")
S_PROD_WEB_URL=$(escape_sed "$PROD_WEB_URL")

sed \
  -e "s|__STAGING_D1_ID__|$S_STAGING_D1_ID|g" \
  -e "s|__PROD_D1_ID__|$S_PROD_D1_ID|g" \
  -e "s|__STAGING_KV_ID__|$S_STAGING_KV_ID|g" \
  -e "s|__PROD_KV_ID__|$S_PROD_KV_ID|g" \
  -e "s|__STAGING_API_URL__|$S_STAGING_API_URL|g" \
  -e "s|__PROD_API_URL__|$S_PROD_API_URL|g" \
  -e "s|__STAGING_WEB_URL__|$S_STAGING_WEB_URL|g" \
  -e "s|__PROD_WEB_URL__|$S_PROD_WEB_URL|g" \
  "$repo_root/apps/api/wrangler.toml.template" > "$repo_root/apps/api/wrangler.toml"

sed \
  -e "s|__STAGING_D1_ID__|$S_STAGING_D1_ID|g" \
  -e "s|__PROD_D1_ID__|$S_PROD_D1_ID|g" \
  -e "s|__STAGING_API_URL__|$S_STAGING_API_URL|g" \
  -e "s|__PROD_API_URL__|$S_PROD_API_URL|g" \
  "$repo_root/apps/web/wrangler.jsonc.template" > "$repo_root/apps/web/wrangler.jsonc"

echo "[render-wrangler-config] wrote apps/api/wrangler.toml and apps/web/wrangler.jsonc"
