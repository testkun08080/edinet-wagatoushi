#!/usr/bin/env bash
# public/data を tar.gz に固める（CI 配布用）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCREENER_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PUBLIC_DATA_DIR="${PUBLIC_DATA_DIR:-$SCREENER_ROOT/public/data}"
OUTPUT_PATH="${PUBLIC_DATA_ARCHIVE:-$SCREENER_ROOT/public-data.tar.gz}"

if [ ! -d "$PUBLIC_DATA_DIR" ]; then
  echo "[package-public-data] public/data が見つかりません: $PUBLIC_DATA_DIR" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUTPUT_PATH")"
tar -czf "$OUTPUT_PATH" -C "$PUBLIC_DATA_DIR" .
echo "[package-public-data] 作成完了: $OUTPUT_PATH"
