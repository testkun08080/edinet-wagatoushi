#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../.."

TARGET_DATE="${1:-}"
DB_PATH="${DB_PATH:-state/edinet_pipeline.db}"
RAW_ROOT="${RAW_ROOT:-raw}"
DOC_TYPES="${DOC_TYPES:-annual,quarterly,semiannual,large_holding}"

ARGS=(--doc_types "$DOC_TYPES" --db_path "$DB_PATH" --schema_path sql/d1_schema.sql --raw_root "$RAW_ROOT" --scope daily-hybrid)
if [ -n "$TARGET_DATE" ]; then
  ARGS+=(--target_date "$TARGET_DATE")
fi

uv run python scripts/pipeline/ingest_daily_edinet_to_db.py "${ARGS[@]}"
uv run python scripts/pipeline/materialize_daily_aggregates.py --db_path "$DB_PATH"
uv run python scripts/pipeline/check_daily_delta.py --db_path "$DB_PATH" --max_drop_ratio "${MAX_DROP_RATIO:-0.7}"

echo "Hybrid ingest completed (db=$DB_PATH)"
