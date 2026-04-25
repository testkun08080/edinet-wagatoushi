#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCREENER_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
source "$SCRIPT_DIR/resolve-wrangler.sh"
WRANGLER="$(resolve_wrangler "$SCREENER_ROOT")"

ENVIRONMENT="${1:-}"
SQL_DIR="${2:-}"
START_FROM="${3:-}"
if [ -z "$ENVIRONMENT" ] || [ -z "$SQL_DIR" ]; then
  echo "Usage: $0 <staging|production> <sql-dir> [start-from-chunk]"
  echo "example: $0 production ../edinet-wrapper/state/d1-seed-sql 0003_documents_0001.sql"
  exit 1
fi

case "$ENVIRONMENT" in
  staging | production) ;;
  *)
    echo "Invalid environment: $ENVIRONMENT"
    echo "Allowed environments: staging, production"
    exit 1
    ;;
esac

if [ ! -d "$SQL_DIR" ]; then
  echo "SQL directory not found: $SQL_DIR"
  exit 1
fi

MANIFEST="$SQL_DIR/manifest.txt"
if [ ! -f "$MANIFEST" ]; then
  echo "Manifest not found: $MANIFEST"
  exit 1
fi

if [ -n "$START_FROM" ]; then
  echo "[d1] skipping chunks until $START_FROM"
fi

SKIPPING=0
if [ -n "$START_FROM" ]; then
  SKIPPING=1
fi

while IFS= read -r chunk || [ -n "$chunk" ]; do
  chunk="${chunk%$'\r'}"
  [ -n "$chunk" ] || continue
  if [ "$SKIPPING" -eq 1 ] && [ "$chunk" != "$START_FROM" ]; then
    continue
  fi
  SKIPPING=0
  echo "[d1] applying $chunk to env=$ENVIRONMENT"
  if "$WRANGLER" d1 execute EDINET_DB --env "$ENVIRONMENT" --remote --file "$SQL_DIR/$chunk"; then
    continue
  else
    status=$?
    echo "ERROR applying $chunk: exit $status"
    exit "$status"
  fi
done < "$MANIFEST"

if [ "$SKIPPING" -eq 1 ]; then
  echo "Start chunk not found in manifest: $START_FROM"
  exit 1
fi
