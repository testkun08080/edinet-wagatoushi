#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-}"
if [ -z "$ENVIRONMENT" ]; then
  echo "Usage: $0 <environment>"
  echo "example: $0 staging"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCREENER_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$SCREENER_ROOT/.." && pwd)"
WRAPPER="$REPO_ROOT/edinet-wrapper"

DB_PATH="${DB_PATH:-$WRAPPER/state/edinet_pipeline_seed.db}"
SQL_DIR="${SQL_DIR:-$WRAPPER/state/d1-seed-sql}"
DATA_ROOT="${DATA_ROOT:-$WRAPPER/data}"

echo "[seed] building seed DB from $DATA_ROOT"
(
  cd "$WRAPPER"
  uv run python scripts/pipeline/import_corpus_to_db.py \
    --data_root "$DATA_ROOT" \
    --db_path "$DB_PATH" \
    --schema_path sql/d1_schema.sql \
    --reset
  uv run python scripts/pipeline/materialize_daily_aggregates.py --db_path "$DB_PATH"
  rm -rf "$SQL_DIR"
  uv run python scripts/pipeline/export_db_to_d1_sql.py \
    --db_path "$DB_PATH" \
    --output_dir "$SQL_DIR" \
    --chunk_rows "${D1_SQL_CHUNK_ROWS:-25}"
)

echo "[seed] applying schema to D1 env=$ENVIRONMENT"
bash "$SCRIPT_DIR/d1-apply-schema.sh" "$ENVIRONMENT"

echo "[seed] applying seed chunks to D1 env=$ENVIRONMENT"
(
  cd "$SCREENER_ROOT"
  bash "$SCRIPT_DIR/d1-execute-sql-dir.sh" "$ENVIRONMENT" "$SQL_DIR"
)

echo "D1 seed completed (env=$ENVIRONMENT db=$DB_PATH sql=$SQL_DIR)"
