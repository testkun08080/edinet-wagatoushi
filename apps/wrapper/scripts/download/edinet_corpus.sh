#!/bin/bash
#
# EDINET コーパスを期間・書類種別ごとにダウンロードする。
# ローカルで全期間回す場合: ./scripts/download/edinet_corpus.sh
# 1チャンクだけ（GHA用・月単位）: DOC_TYPE=quarterly YEAR=2019 MONTH=3 ./scripts/download/edinet_corpus.sh
# 1チャンクだけ（GHA用・日付範囲・月内分割用）: DOC_TYPE=annual START_DATE=2021-06-01 END_DATE=2021-06-07 ./scripts/download/edinet_corpus.sh
# 既に output にファイルがある企業を丸ごとスキップ: SKIP_EXISTING_COMPANIES=1（または true）を付与
#
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../.."

run_prepare() {
    local doc_type="$1"
    local start_date="$2"
    local end_date="$3"
    echo "doc_type: $doc_type, start_date: $start_date, end_date: $end_date"
    local skip_flag=()
    case "${SKIP_EXISTING_COMPANIES:-}" in
        1|true|yes|TRUE|YES) skip_flag=(--skip_existing_companies) ;;
    esac
    uv run python scripts/download/prepare_edinet_corpus.py \
        --doc_type "$doc_type" \
        --start_date "$start_date" \
        --end_date "$end_date" \
        "${skip_flag[@]}"
}

run_month() {
    local doc_type="$1"
    local year="$2"
    local month="$3"
    local start_date="${year}-$(printf "%02d" "$month")-01"
    local end_date
    if [ "$month" -eq 12 ]; then
        end_date="$((year + 1))-01-01"
    else
        end_date="${year}-$(printf "%02d" "$((month + 1))")-01"
    fi
    run_prepare "$doc_type" "$start_date" "$end_date"
}

# 日付範囲を直接指定（月内の N 日チャンク用。START/END が優先）
if [ -n "${DOC_TYPE:-}" ] && [ -n "${START_DATE:-}" ] && [ -n "${END_DATE:-}" ]; then
    run_prepare "$DOC_TYPE" "$START_DATE" "$END_DATE"
    exit 0
fi

# 1チャンクだけ実行（GitHub Actions の matrix 用・月単位）
if [ -n "${DOC_TYPE:-}" ] && [ -n "${YEAR:-}" ] && [ -n "${MONTH:-}" ]; then
    run_month "$DOC_TYPE" "$YEAR" "$MONTH"
    exit 0
fi

# デフォルト: 全期間ループ（ローカル用）
doc_types=(
    # "annual"
    "quarterly"
    # "semiannual"
    # "annual_amended"
    # "quarterly_amended"
    # "semiannual_amended"
)
years=(2019)  # 複数指定可: (2018 2019 2020)

for year in "${years[@]}"; do
    for doc_type in "${doc_types[@]}"; do
        for month in $(seq 1 12); do
            run_month "$doc_type" "$year" "$month"
        done
    done
done
