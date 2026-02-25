#!/usr/bin/env bash
# リモートの data-set（zip / tar.gz）を取得して展開する。
# 使用: DATA_SET_URL=https://... npm run generate-data または build
#
# 環境変数:
#   DATA_SET_URL   - 必須。data-set の zip または tar.gz の URL
#   DATA_SET_PATH  - 展開先（未指定時はプロジェクトルートの data-set）
#   FORCE_DOWNLOAD - 1 のとき既存の data-set があっても再取得する

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCREENER_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$SCREENER_ROOT/.." && pwd)"
DEST="${DATA_SET_PATH:-$REPO_ROOT/data-set}"

if [ -z "$DATA_SET_URL" ]; then
  echo "[fetch-dataset] DATA_SET_URL が未設定です。スキップします。"
  exit 0
fi

if [ -d "$DEST" ] && [ -n "$(ls -A "$DEST" 2>/dev/null)" ] && [ "$FORCE_DOWNLOAD" != "1" ]; then
  echo "[fetch-dataset] 既に data-set が存在します ($DEST)。スキップします。（再取得する場合は FORCE_DOWNLOAD=1）"
  exit 0
fi

echo "[fetch-dataset] 取得中: $DATA_SET_URL"
mkdir -p "$DEST"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if [[ "$DATA_SET_URL" == *.zip ]]; then
  curl -fsSL -o "$TMP_DIR/archive.zip" "$DATA_SET_URL"
  unzip -o -q "$TMP_DIR/archive.zip" -d "$TMP_DIR/extract"
  # 展開結果が1ディレクトリだけならその中身を DEST に
  ITEMS=("$TMP_DIR/extract"/*)
  if [ "${#ITEMS[@]}" -eq 1 ] && [ -d "${ITEMS[0]}" ]; then
    cp -R "${ITEMS[0]}"/* "$DEST/"
  else
    cp -R "$TMP_DIR/extract"/* "$DEST/"
  fi
elif [[ "$DATA_SET_URL" == *.tar.gz ]] || [[ "$DATA_SET_URL" == *.tgz ]]; then
  curl -fsSL "$DATA_SET_URL" | tar -xzf - -C "$TMP_DIR"
  # 展開された直下が1ディレクトリだけならその中身を DEST に
  ITEMS=("$TMP_DIR"/*)
  if [ "${#ITEMS[@]}" -eq 1 ] && [ -d "${ITEMS[0]}" ]; then
    cp -R "${ITEMS[0]}"/* "$DEST/"
  else
    cp -R "$TMP_DIR"/* "$DEST/"
  fi
else
  echo "[fetch-dataset] 未対応の形式です。.zip または .tar.gz の URL を指定してください。"
  exit 1
fi

echo "[fetch-dataset] 展開完了: $DEST"
