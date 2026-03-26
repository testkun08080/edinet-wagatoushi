# クイックスタートガイド

ローカルで素早くテストするための簡単な手順です。

## 最短手順（3ステップ）

### 1. 環境変数を設定

```bash
cd edinet-wrapper
echo "EDINET_API_KEY=your-api-key-here" > .env
```

### 2. 依存関係をインストール

```bash
uv sync
```

### 3. テスト実行

```bash
# 方法1: テストスクリプトを使用（推奨）
./scripts/download/test_download.sh E02144 tsv 1

# 方法2: 直接実行
uv run python scripts/download/download_company_10years.py \
  --edinet_code E02144 \
  --file_type tsv \
  --years 1
```

## テストスクリプトの使い方

```bash
# 基本的な使い方（デフォルト: トヨタ自動車、1年分）
./scripts/download/test_download.sh

# カスタムパラメータ
./scripts/download/test_download.sh E02144 tsv 1
# 引数1: EDINETコード
# 引数2: ファイル形式 (tsv/pdf/xbrl)
# 引数3: 年数
```

## 実行例

### 例1: トヨタ自動車の1年分をテスト

```bash
./scripts/download/test_download.sh E02144 tsv 1
```

### 例2: ソニーグループの1年分をテスト

```bash
./scripts/download/test_download.sh E00324 tsv 1
```

### 例3: 10年分をダウンロード（本番用）

```bash
uv run python scripts/download/download_company_10years.py \
  --edinet_code E02144 \
  --file_type tsv \
  --years 10
```

## 結果の確認

```bash
# ダウンロードされたファイルを確認
ls -lh data/E02144/

# メタデータを確認
cat data/E02144/metadata.json | python -m json.tool
```

## トラブルシューティング

### EDINET_API_KEYが設定されていない

```bash
# .envファイルを作成
echo "EDINET_API_KEY=your-api-key" > .env

# または環境変数を直接設定
export EDINET_API_KEY="your-api-key"
```

### uvがインストールされていない

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# または pip でインストール
pip install uv
```

詳細は `LOCAL_TESTING.md` を参照してください。
