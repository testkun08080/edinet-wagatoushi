#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-}"
case "$ENVIRONMENT" in
  staging | production) ;;
  *)
    echo "Usage: $0 <staging|production>"
    echo "example: $0 staging"
    echo "WARNING: production seeds the live D1 database from apps/wrapper/data."
    exit 1
    ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCREENER_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$SCREENER_ROOT/.." && pwd)"
WRAPPER="$REPO_ROOT/apps/wrapper"

DB_PATH="${DB_PATH:-$WRAPPER/state/edinet_pipeline_seed.db}"
SQL_DIR="${SQL_DIR:-$WRAPPER/state/d1-seed-sql}"
DATA_ROOT="${DATA_ROOT:-$WRAPPER/data}"
IMPORT_ROOT="${IMPORT_ROOT:-$WRAPPER/state/import-root}"
DATA_LINK_MODE="${DATA_LINK_MODE:-symlink}"
D1_SQL_CHUNK_ROWS="${D1_SQL_CHUNK_ROWS:-25}"
MAX_D1_CHUNKS_PER_RUN="${MAX_D1_CHUNKS_PER_RUN:-5000}"

DATA_ROOT_FOR_IMPORT="$DATA_ROOT"
if ! ls "$DATA_ROOT"/E* >/dev/null 2>&1; then
  echo "[seed] data root is not corpus-compatible; converting data-set -> import-root"
  (
    cd "$WRAPPER"
    uv run python scripts/pipeline/convert_dataset_to_import_root.py \
      --data_set_root "$DATA_ROOT" \
      --output_root "$IMPORT_ROOT" \
      --link_mode "$DATA_LINK_MODE" \
      --reset
  )
  DATA_ROOT_FOR_IMPORT="$IMPORT_ROOT"
fi

echo "[seed] building seed DB from $DATA_ROOT_FOR_IMPORT"
(
  cd "$WRAPPER"
  uv run python scripts/pipeline/import_corpus_to_db.py \
    --data_root "$DATA_ROOT_FOR_IMPORT" \
    --db_path "$DB_PATH" \
    --schema_path sql/d1_schema.sql \
    --reset
  uv run python scripts/pipeline/materialize_daily_aggregates.py --db_path "$DB_PATH"
  rm -rf "$SQL_DIR"
  uv run python scripts/pipeline/export_db_to_d1_sql.py \
    --db_path "$DB_PATH" \
    --output_dir "$SQL_DIR" \
    --chunk_rows "$D1_SQL_CHUNK_ROWS"
)

if [ -f "$SQL_DIR/manifest.txt" ]; then
  CHUNK_COUNT="$(wc -l < "$SQL_DIR/manifest.txt" | tr -d ' ')"
  if [ "$CHUNK_COUNT" -gt "$MAX_D1_CHUNKS_PER_RUN" ]; then
    echo "[seed] aborting: chunk_count=$CHUNK_COUNT exceeds MAX_D1_CHUNKS_PER_RUN=$MAX_D1_CHUNKS_PER_RUN"
    exit 1
  fi
fi

echo "[seed] applying schema to D1 env=$ENVIRONMENT"
bash "$SCRIPT_DIR/d1-apply-schema.sh" "$ENVIRONMENT"

echo "[seed] applying seed chunks to D1 env=$ENVIRONMENT"
(
  cd "$SCREENER_ROOT"
  bash "$SCRIPT_DIR/d1-execute-sql-dir.sh" "$ENVIRONMENT" "$SQL_DIR"
)

echo "D1 seed completed (env=$ENVIRONMENT db=$DB_PATH sql=$SQL_DIR)"
