#!/usr/bin/env bash
## One-shot bootstrap for fork users.
## Creates D1 databases + R2 bucket, materialises wrangler.toml from the
## template, and prints next-step Secrets-setting commands.
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

bold() { printf "\033[1m%s\033[0m\n" "$1"; }
green() { printf "\033[32m%s\033[0m\n" "$1"; }
red() { printf "\033[31m%s\033[0m\n" "$1"; }

bold "▶ wrangler whoami"
if ! npx wrangler whoami >/dev/null 2>&1; then
  red "wrangler is not logged in. Run: npx wrangler login"
  exit 1
fi

bold "▶ Create D1 databases (staging + production)"
get_id() {
  local out="$1"
  echo "$out" | awk -F\" '/database_id/ {print $4}'
}

staging_out=$(npx wrangler d1 create edinet-staging 2>&1 || true)
prod_out=$(npx wrangler d1 create edinet-production 2>&1 || true)

staging_id=$(get_id "$staging_out")
prod_id=$(get_id "$prod_out")

if [ -z "$staging_id" ] || [ -z "$prod_id" ]; then
  red "Failed to extract D1 ids. Output below:"
  echo "$staging_out"
  echo "---"
  echo "$prod_out"
  exit 1
fi

bold "▶ Create KV namespaces"
staging_kv=$(npx wrangler kv namespace create EDINET_CACHE --env staging 2>&1 | awk -F\" '/id/ {print $4}' || true)
prod_kv=$(npx wrangler kv namespace create EDINET_CACHE --env production 2>&1 | awk -F\" '/id/ {print $4}' || true)

bold "▶ Create R2 bucket"
npx wrangler r2 bucket create edinet-data || true

bold "▶ Render apps/api/wrangler.toml from template"
template="apps/api/wrangler.toml.template"
target="apps/api/wrangler.toml"
sed \
  -e "s|__STAGING_D1_ID__|$staging_id|" \
  -e "s|__PROD_D1_ID__|$prod_id|" \
  -e "s|__STAGING_KV_ID__|$staging_kv|" \
  -e "s|__PROD_KV_ID__|$prod_kv|" \
  "$template" > "$target"
green "Wrote $target"

bold "▶ Apply schema to D1 (staging + production)"
pnpm --filter @edinet/api db:migrate:staging || true
pnpm --filter @edinet/api db:migrate:production || true

bold "✅ Done. Next:"
cat <<EOF

  # GitHub Secrets the deploy workflows expect:
  gh secret set CLOUDFLARE_API_TOKEN
  gh secret set CLOUDFLARE_ACCOUNT_ID
  gh secret set EDINET_API_KEY

  # Push to trigger your first deploy:
  git add apps/api/wrangler.toml
  git commit -m "chore: setup fork"
  git push

EOF
