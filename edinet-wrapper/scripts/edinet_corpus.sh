#!/bin/bash
#
# EDINET コーパスを期間・書類種別ごとにダウンロードする。
# ローカルで全期間回す場合: ./scripts/edinet_corpus.sh
# 1チャンクだけ（GHA用）: DOC_TYPE=quarterly YEAR=2019 MONTH=3 ./scripts/edinet_corpus.sh
#
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

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
    echo "doc_type: $doc_type, start_date: $start_date, end_date: $end_date"
    uv run python scripts/prepare_edinet_corpus.py \
        --doc_type "$doc_type" \
        --start_date "$start_date" \
        --end_date "$end_date"
}

# 1チャンクだけ実行（GitHub Actions の matrix 用）
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
