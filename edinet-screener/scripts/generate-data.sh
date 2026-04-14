#!/usr/bin/env bash
# ビルド前に data-set から public/data を生成する。
# DATA_SET_URL が設定されていれば、先にリモートから data-set を取得する。

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCREENER_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$SCREENER_ROOT/.." && pwd)"
DATA_SET="${DATA_SET_PATH:-$REPO_ROOT/data-set}"
WRAPPER="$REPO_ROOT/edinet-wrapper"
BUILD_MODE="${SCREENER_BUILD_MODE:-full}"
NO_RAW_TSV="${SCREENER_NO_RAW_TSV:-0}"
NO_REPORT="${SCREENER_NO_REPORT:-1}"
SAMPLE_LIST="${SCREENER_SAMPLE_LIST:-}"
SAMPLE_CODES="${SCREENER_SAMPLE_CODES:-}"

# リモートにデータセットがある場合: 未取得なら取得する
if [ -n "$DATA_SET_URL" ] && { [ ! -d "$DATA_SET" ] || [ -z "$(ls -A "$DATA_SET" 2>/dev/null)" ]; }; then
  bash "$SCRIPT_DIR/fetch-dataset.sh"
fi

if [ ! -d "$DATA_SET" ]; then
  echo "[generate-data] data-set がありません ($DATA_SET)。スキップします。"
  exit 0
fi

if [ ! -d "$WRAPPER" ] || [ ! -f "$WRAPPER/scripts/frontend/build_screener_data.py" ]; then
  echo "[generate-data] edinet-wrapper が見つかりません。スキップします。"
  exit 0
fi

echo "[generate-data] data-set から public/data を生成します..."
CMD=(uv run python scripts/frontend/build_screener_data.py --mode "$BUILD_MODE" --data_set "$DATA_SET" --output "$SCREENER_ROOT/public/data")
if [ "$BUILD_MODE" = "sample" ] && [ -n "$SAMPLE_LIST" ]; then
  CMD+=(--list "$SAMPLE_LIST")
fi
if [ "$BUILD_MODE" = "sample" ] && [ -n "$SAMPLE_CODES" ]; then
  IFS=',' read -r -a codes <<< "$SAMPLE_CODES"
  CMD+=("${codes[@]}")
fi
if [ "$NO_RAW_TSV" = "1" ]; then
  CMD+=(--no_raw_tsv)
fi
if [ "$NO_REPORT" = "1" ]; then
  CMD+=(--no_report)
fi
(cd "$WRAPPER" && "${CMD[@]}")
echo "[generate-data] 完了。"
