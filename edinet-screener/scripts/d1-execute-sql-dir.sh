#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-}"
SQL_DIR="${2:-}"
if [ -z "$ENVIRONMENT" ] || [ -z "$SQL_DIR" ]; then
  echo "Usage: $0 <environment> <sql-dir>"
  echo "example: $0 production ../edinet-wrapper/state/d1-seed-sql"
  exit 1
fi

if [ ! -d "$SQL_DIR" ]; then
  echo "SQL directory not found: $SQL_DIR"
  exit 1
fi

MANIFEST="$SQL_DIR/manifest.txt"
if [ ! -f "$MANIFEST" ]; then
  echo "Manifest not found: $MANIFEST"
  exit 1
fi

while IFS= read -r chunk; do
  [ -n "$chunk" ] || continue
  echo "[d1] applying $chunk to env=$ENVIRONMENT"
  wrangler d1 execute EDINET_DB --env "$ENVIRONMENT" --remote --file "$SQL_DIR/$chunk"
done < "$MANIFEST"
