#!/bin/sh
## Pull a small sample SQLite from the latest GitHub Release so a fork
## user can run `docker compose up` and see something within a minute.
set -eu

DATA_DIR="${DATA_DIR:-/data}"
TARGET="$DATA_DIR/edinet.db"
RELEASE_URL="${SAMPLE_DB_URL:-https://github.com/testkun08080/edinet-wagatoushi/releases/latest/download/sample-edinet.db.gz}"

mkdir -p "$DATA_DIR"

if [ -f "$TARGET" ]; then
  size=$(wc -c < "$TARGET" 2>/dev/null || echo 0)
  if [ "$size" -gt 1024 ]; then
    echo "[fetch-sample-data] $TARGET already exists ($size bytes), skipping."
    exit 0
  fi
fi

echo "[fetch-sample-data] downloading sample DB from $RELEASE_URL"
apk add --no-cache wget gzip >/dev/null 2>&1 || true

if ! wget -q -O /tmp/sample.db.gz "$RELEASE_URL"; then
  echo "[fetch-sample-data] WARN: download failed. Creating empty DB so the API can boot."
  : > "$TARGET"
  exit 0
fi

gunzip -c /tmp/sample.db.gz > "$TARGET"
rm -f /tmp/sample.db.gz
echo "[fetch-sample-data] ready: $(wc -c < "$TARGET") bytes"
