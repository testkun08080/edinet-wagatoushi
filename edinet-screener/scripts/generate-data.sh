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

if [ ! -d "$DATA_SET" ]; then
  echo "[generate-data] data-set がありません ($DATA_SET)。スキップします。"
  exit 0
fi

if [ ! -d "$WRAPPER" ] || [ ! -f "$WRAPPER/scripts/fetch_33_companies.py" ]; then
  echo "[generate-data] edinet-wrapper が見つかりません。スキップします。"
  exit 0
fi

echo "[generate-data] data-set から public/data を生成します..."
(cd "$WRAPPER" && export DATA_SET_PATH="$DATA_SET" && uv run python scripts/fetch_33_companies.py)
echo "[generate-data] 完了。"
