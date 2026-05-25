#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCREENER_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$SCREENER_ROOT/.." && pwd)"
source "$SCRIPT_DIR/resolve-wrangler.sh"

ENVIRONMENT="${1:-}"
if [ -z "$ENVIRONMENT" ]; then
  echo "Usage: $0 <environment>"
  echo "example: $0 staging"
  exit 1
fi

SCHEMA_PATH="$REPO_ROOT/edinet-wrapper/sql/d1_schema.sql"
if [ ! -f "$SCHEMA_PATH" ]; then
  echo "Schema not found: $SCHEMA_PATH"
  exit 1
fi

cd "$SCREENER_ROOT"
"$(resolve_wrangler "$SCREENER_ROOT")" d1 execute EDINET_DB --env "$ENVIRONMENT" --remote --file "$SCHEMA_PATH"
echo "Applied D1 schema to env=$ENVIRONMENT"
