#!/usr/bin/env bash
# ビルド前に data-set または D1 互換 DB から public/data を生成する。
# DATA_SET_URL が設定されていれば、先にリモートから data-set を取得する。
# DATA_SCOPE=sample|full で生成対象を切替（未指定時は sample）。
# DATA_SOURCE=dataset|d1（未指定時は dataset）

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCREENER_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$SCREENER_ROOT/.." && pwd)"
DATA_SET="${DATA_SET_PATH:-$REPO_ROOT/data-set}"
WRAPPER="$REPO_ROOT/edinet-wrapper"
DATA_SOURCE="${DATA_SOURCE:-dataset}"

if [ "$DATA_SOURCE" != "d1" ]; then
  # リモートにデータセットがある場合: 未取得なら取得する
  if [ -n "$DATA_SET_URL" ] && { [ ! -d "$DATA_SET" ] || [ -z "$(ls -A "$DATA_SET" 2>/dev/null)" ]; }; then
    bash "$SCRIPT_DIR/fetch-dataset.sh"
  fi
fi

if [ "$DATA_SOURCE" = "dataset" ]; then
  # data-set がない場合は edinet-wrapper/data にフォールバック（ローカル開発用サンプルデータ）
  if [ ! -d "$DATA_SET" ]; then
    if [ -d "$WRAPPER/data" ] && [ -n "$(ls -A "$WRAPPER/data" 2>/dev/null)" ]; then
      DATA_SET="$WRAPPER/data"
      echo "[generate-data] data-set が見つからないため edinet-wrapper/data を使用します。"
    else
      if [ "$DATA_SOURCE" = "dataset" ]; then
        echo "[generate-data] data-set がありません ($DATA_SET)。スキップします。"
        exit 0
      fi
    fi
  fi
fi

if [ "$DATA_SOURCE" != "dataset" ] && [ "$DATA_SOURCE" != "d1" ]; then
  echo "[generate-data] DATA_SOURCE は dataset または d1 を指定してください。（現在: $DATA_SOURCE）"
  exit 1
fi

if [ ! -d "$WRAPPER" ] || [ ! -f "$WRAPPER/scripts/frontend/build_screener_data.py" ]; then
  echo "[generate-data] edinet-wrapper が見つかりません。スキップします。"
  exit 0
fi

OUTPUT="${OUTPUT_PATH:-$SCREENER_ROOT/public/data}"
DATA_SCOPE="${DATA_SCOPE:-sample}"

if [ "$DATA_SCOPE" != "sample" ] && [ "$DATA_SCOPE" != "full" ]; then
  echo "[generate-data] DATA_SCOPE は sample または full を指定してください。（現在: $DATA_SCOPE）"
  exit 1
fi

if [ "$DATA_SOURCE" = "d1" ]; then
  D1_DB_PATH="${D1_DB_PATH:-$WRAPPER/state/edinet_pipeline.db}"
  echo "[generate-data] D1互換DB から public/data を生成します... (db=$D1_DB_PATH)"
  (cd "$WRAPPER" && uv run python scripts/pipeline/build_public_data_from_db.py --db_path "$D1_DB_PATH" --output "$OUTPUT")
  echo "[generate-data] 完了。"
  exit 0
fi

echo "[generate-data] data-set から public/data を生成します... (mode=$DATA_SCOPE)"
(cd "$WRAPPER" && uv run python scripts/frontend/build_screener_data.py --mode "$DATA_SCOPE" --data_set "$DATA_SET" --output "$OUTPUT")
echo "[generate-data] 完了。"
