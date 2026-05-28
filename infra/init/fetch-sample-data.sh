#!/bin/sh
## Generate a local sample SQLite so `docker compose up` always boots
## without depending on external downloads.
set -eu

DATA_DIR="${DATA_DIR:-/data}"
TARGET="$DATA_DIR/edinet.db"
MIGRATION_SQL="${MIGRATION_SQL:-/migrations/0000_init.sql}"

mkdir -p "$DATA_DIR"

if [ -f "$TARGET" ]; then
  size=$(wc -c < "$TARGET" 2>/dev/null || echo 0)
  if [ "$size" -gt 1024 ]; then
    echo "[fetch-sample-data] $TARGET already exists ($size bytes), skipping."
    exit 0
  fi
fi

echo "[fetch-sample-data] generating local sample DB at $TARGET"
apk add --no-cache sqlite >/dev/null 2>&1

if [ ! -f "$MIGRATION_SQL" ]; then
  echo "[fetch-sample-data] FATAL: migration file not found: $MIGRATION_SQL"
  exit 1
fi

rm -f "$TARGET"
sqlite3 "$TARGET" < "$MIGRATION_SQL"

SEED_SQL="${SEED_SQL:-/init/seed-local-d1.sql}"
if [ ! -f "$SEED_SQL" ]; then
  echo "[fetch-sample-data] FATAL: seed file not found: $SEED_SQL"
  exit 1
fi
sqlite3 "$TARGET" < "$SEED_SQL"

echo "[fetch-sample-data] ready: $(wc -c < "$TARGET") bytes"
