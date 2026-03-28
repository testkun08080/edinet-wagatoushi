#!/bin/bash
# ローカルテスト用の簡単なスクリプト

set -e

# カラー出力
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== EDINET データダウンロード ローカルテスト ===${NC}"
echo ""

# プロジェクトルートに移動
cd "$(dirname "$0")/../.."

# EDINET_API_KEYの確認
if [ -z "$EDINET_API_KEY" ]; then
    if [ -f ".env" ]; then
        echo -e "${YELLOW}Loading EDINET_API_KEY from .env file...${NC}"
        export $(cat .env | grep EDINET_API_KEY | xargs)
    else
        echo -e "${RED}Error: EDINET_API_KEY is not set${NC}"
        echo "Please set EDINET_API_KEY environment variable or create .env file"
        echo ""
        echo "Example:"
        echo "  export EDINET_API_KEY=\"your-api-key\""
        echo "  or"
        echo "  echo 'EDINET_API_KEY=your-api-key' > .env"
        exit 1
    fi
fi

# パラメータの設定（デフォルト値）
EDINET_CODE="${1:-E02144}"  # デフォルト: トヨタ自動車
FILE_TYPE="${2:-tsv}"       # デフォルト: tsv
YEARS="${3:-1}"              # デフォルト: 1年（テスト用）

echo -e "${GREEN}Parameters:${NC}"
echo "  EDINET Code: $EDINET_CODE"
echo "  File Type: $FILE_TYPE"
echo "  Years: $YEARS"
echo ""

# 依存関係の確認
if ! command -v uv &> /dev/null; then
    echo -e "${RED}Error: uv is not installed${NC}"
    echo "Please install uv: https://github.com/astral-sh/uv"
    exit 1
fi

# 依存関係のインストール
echo -e "${YELLOW}Installing dependencies...${NC}"
uv sync

# スクリプトの実行
echo -e "${YELLOW}Downloading data...${NC}"
echo ""

uv run python scripts/download/download_company_10years.py \
    --edinet_code "$EDINET_CODE" \
    --file_type "$FILE_TYPE" \
    --years "$YEARS"

# 結果の確認
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}=== Download completed successfully! ===${NC}"
    echo ""
    echo "Downloaded files:"
    if [ -d "data/$EDINET_CODE" ]; then
        ls -lh "data/$EDINET_CODE/"
        echo ""
        echo "Metadata:"
        if [ -f "data/$EDINET_CODE/metadata.json" ]; then
            cat "data/$EDINET_CODE/metadata.json" | python -m json.tool 2>/dev/null || cat "data/$EDINET_CODE/metadata.json"
        fi
    fi
else
    echo ""
    echo -e "${RED}=== Download failed ===${NC}"
    exit 1
fi
