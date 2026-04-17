#!/usr/bin/env bash
# ビルド前に data-set から public/data を生成する。
# DATA_SET_URL が設定されていれば、先にリモートから data-set を取得する。

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCREENER_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$SCREENER_ROOT/.." && pwd)"
DATA_SET="${DATA_SET_PATH:-$REPO_ROOT/data-set}"
WRAPPER="$REPO_ROOT/edinet-wrapper"

# リモートにデータセットがある場合: 未取得なら取得する
if [ -n "$DATA_SET_URL" ] && { [ ! -d "$DATA_SET" ] || [ -z "$(ls -A "$DATA_SET" 2>/dev/null)" ]; }; then
  bash "$SCRIPT_DIR/fetch-dataset.sh"
fi

# data-set がない場合は edinet-wrapper/data にフォールバック（ローカル開発用サンプルデータ）
if [ ! -d "$DATA_SET" ]; then
  if [ -d "$WRAPPER/data" ] && [ -n "$(ls -A "$WRAPPER/data" 2>/dev/null)" ]; then
    DATA_SET="$WRAPPER/data"
    echo "[generate-data] data-set が見つからないため edinet-wrapper/data を使用します。"
  else
    echo "[generate-data] data-set がありません ($DATA_SET)。スキップします。"
    exit 0
  fi
fi

if [ ! -d "$WRAPPER" ] || [ ! -f "$WRAPPER/scripts/frontend/build_screener_data.py" ]; then
  echo "[generate-data] edinet-wrapper が見つかりません。スキップします。"
  exit 0
fi

OUTPUT="${OUTPUT_PATH:-$SCREENER_ROOT/public/data}"

echo "[generate-data] data-set から public/data を生成します..."
(cd "$WRAPPER" && uv run python scripts/frontend/build_screener_data.py --mode sample --data_set "$DATA_SET" --output "$OUTPUT")
echo "[generate-data] 完了。"
