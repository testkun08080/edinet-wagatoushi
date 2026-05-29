#!/usr/bin/env bash
## Upload INTERNAL_API_KEY from .internal-api-key to Cloudflare (api + web, staging + production).
## Does NOT generate a key — you must create .internal-api-key yourself (see .internal-api-key.example).
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
key_file="$repo_root/.internal-api-key"

if [ ! -f "$key_file" ]; then
  echo "Missing $key_file" >&2
  echo "  cp .internal-api-key.example .internal-api-key" >&2
  echo "  # edit .internal-api-key and set your own secret" >&2
  exit 1
fi

INTERNAL_API_KEY=$(grep -v '^#' "$key_file" | grep -v '^[[:space:]]*$' | head -1 | tr -d '\n\r')
if [ -z "$INTERNAL_API_KEY" ] || [ "$INTERNAL_API_KEY" = "your-internal-api-key-change-me" ]; then
  echo "Replace the placeholder in .internal-api-key before running this script." >&2
  exit 1
fi

put_secret() {
  local app_dir="$1"
  local env_name="$2"
  printf '%s' "$INTERNAL_API_KEY" | (cd "$app_dir" && npx wrangler secret put INTERNAL_API_KEY --env "$env_name")
}

echo "Uploading INTERNAL_API_KEY to api + web (staging + production)..."
for env_name in staging production; do
  put_secret "$repo_root/apps/api" "$env_name"
  put_secret "$repo_root/apps/web" "$env_name"
done

echo "Done. Optionally store the same value in GitHub for your records:"
echo "  gh secret set INTERNAL_API_KEY --body \"<your-key>\""
