#!/usr/bin/env bash
#
# 指定日（提出日ベース）の有価証券報告書・大量保有報告を edinet_corpus と同じ出力形式で取得する。
# 手動実行、ローカル cron、または GitHub Actions（edinet_fetch_one_day.yml 等）から呼び出す。
#
# 使い方:
#   cd edinet-wrapper
#   export EDINET_API_KEY=...
#   ./scripts/download/edinet_fetch_one_day.sh              # 昨日（Asia/Tokyo）
#   ./scripts/download/edinet_fetch_one_day.sh 2026-04-11   # 指定日
#
# 既存企業ディレクトリを丸ごとスキップする場合:
#   SKIP_EXISTING_COMPANIES=1 ./scripts/download/edinet_fetch_one_day.sh
#
# 取得する doc_type を変えたい場合（カンマ区切り、デフォルト: annual,large_holding）:
#   EDINET_ONE_DAY_DOC_TYPES=annual,large_holding,annual_amended ./scripts/download/edinet_fetch_one_day.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../.."

TARGET_DATE="${1:-}"
if [ -z "${TARGET_DATE}" ]; then
  TARGET_DATE="$(TZ=Asia/Tokyo python3 -c "from datetime import date, timedelta; print((date.today() - timedelta(days=1)).isoformat())")"
fi

RAW_TYPES="${EDINET_ONE_DAY_DOC_TYPES:-annual,large_holding}"
IFS=',' read -r -a DOC_TYPES <<< "${RAW_TYPES// /}"

for doc_type in "${DOC_TYPES[@]}"; do
  doc_type="${doc_type// /}"
  [ -z "${doc_type}" ] && continue
  echo "=== edinet_fetch_one_day: ${doc_type} ${TARGET_DATE} ==="
  DOC_TYPE="${doc_type}" START_DATE="${TARGET_DATE}" END_DATE="${TARGET_DATE}" \
    bash scripts/download/edinet_corpus.sh
done

echo "Done. Output under edinet_corpus/<doc_type>/ (same as edinet_corpus.sh)."
