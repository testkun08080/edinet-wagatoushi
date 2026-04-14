#!/usr/bin/env bash
# tar.gz から public/data を復元する（CI デプロイ用）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCREENER_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ARCHIVE_PATH="${PUBLIC_DATA_ARCHIVE:-$SCREENER_ROOT/public-data.tar.gz}"
PUBLIC_DATA_DIR="${PUBLIC_DATA_DIR:-$SCREENER_ROOT/public/data}"

if [ ! -f "$ARCHIVE_PATH" ]; then
  echo "[restore-public-data] アーカイブが見つかりません: $ARCHIVE_PATH" >&2
  exit 1
fi

mkdir -p "$PUBLIC_DATA_DIR"
rm -rf "$PUBLIC_DATA_DIR"
mkdir -p "$PUBLIC_DATA_DIR"
tar -xzf "$ARCHIVE_PATH" -C "$PUBLIC_DATA_DIR"
echo "[restore-public-data] 復元完了: $PUBLIC_DATA_DIR"
