# ローカルテストガイド

GitHub Actionsワークフローをローカルでテストする方法を説明します。

## 前提条件

1. Python 3.10以上がインストールされていること
2. `uv`がインストールされていること
3. EDINET APIキーを取得していること

## セットアップ

### 1. 依存関係のインストール

```bash
cd edinet2dataset
uv sync
```

### 2. 環境変数の設定

#### 方法1: `.env`ファイルを使用（推奨）

プロジェクトルートに`.env`ファイルを作成：

```bash
cd edinet2dataset
echo "EDINET_API_KEY=your-api-key-here" > .env
```

`.env`ファイルは既に`.gitignore`に含まれているため、Gitにコミットされません。

#### 方法2: 環境変数を直接設定

```bash
# macOS/Linux
export EDINET_API_KEY="your-api-key-here"

# Windows (PowerShell)
$env:EDINET_API_KEY="your-api-key-here"
```

#### 方法3: 実行時に指定

```bash
EDINET_API_KEY="your-api-key-here" uv run python scripts/download_company_10years.py ...
```

## テスト実行

### 基本的な実行

```bash
cd edinet2dataset
uv run python scripts/download_company_10years.py \
  --edinet_code E02144 \
  --file_type tsv \
  --years 10
```

### 実行例

#### 例1: トヨタ自動車の10年間分のTSVデータを取得

```bash
cd edinet2dataset
uv run python scripts/download_company_10years.py \
  --edinet_code E02144 \
  --file_type tsv \
  --years 10
```

#### 例2: ソニーグループの5年間分のPDFデータを取得（テスト用）

```bash
cd edinet2dataset
uv run python scripts/download_company_10years.py \
  --edinet_code E00324 \
  --file_type pdf \
  --years 5
```

#### 例3: 短い期間でテスト（1年分のみ）

```bash
cd edinet2dataset
uv run python scripts/download_company_10years.py \
  --edinet_code E02144 \
  --file_type tsv \
  --years 1
```

## 出力の確認

### ダウンロードされたファイル

```bash
# ダウンロードされたファイルを確認
ls -la data/E02144/

# メタデータを確認
cat data/E02144/metadata.json | python -m json.tool
```

### 期待される出力構造

```
data/
└── E02144/
    ├── metadata.json          # メタデータ
    ├── S100TR7I.tsv          # 有価証券報告書（TSV形式）
    ├── S100STED.tsv
    └── ...
```

## トラブルシューティング

### エラー: `EDINET_API_KEY environment variable is not set`

**原因**: 環境変数が設定されていない

**解決方法**:
```bash
# .envファイルを作成
echo "EDINET_API_KEY=your-api-key" > .env

# または環境変数を直接設定
export EDINET_API_KEY="your-api-key"
```

### エラー: `ModuleNotFoundError: No module named 'edinet2dataset'`

**原因**: パスが正しく設定されていない

**解決方法**:
```bash
# プロジェクトルートから実行
cd edinet2dataset
uv run python scripts/download_company_10years.py ...
```

### エラー: `No documents found for E02144`

**原因**: 
- EDINETコードが間違っている
- 指定期間内に有価証券報告書が提出されていない

**解決方法**:
```bash
# EDINETコードを確認
uv run python src/edinet2dataset/downloader.py --query "トヨタ"

# 年数を増やす
uv run python scripts/download_company_10years.py \
  --edinet_code E02144 \
  --years 15  # より長い期間を指定
```

### エラー: `Connection error` または `Timeout`

**原因**: ネットワーク接続の問題、またはEDINET APIのレート制限

**解決方法**:
- インターネット接続を確認
- しばらく待ってから再実行
- 年数を減らしてテスト（例: `--years 1`）

## クイックテスト

最小限のテスト（1年分、1つのファイルのみ）:

```bash
cd edinet2dataset

# 環境変数を設定（.envファイルがあれば不要）
export EDINET_API_KEY="your-api-key"

# 1年分のみダウンロード
uv run python scripts/download_company_10years.py \
  --edinet_code E02144 \
  --file_type tsv \
  --years 1

# 結果を確認
ls -lh data/E02144/
cat data/E02144/metadata.json
```

## デバッグモード

より詳細なログを表示する場合、スクリプト内のログレベルを調整できます。

または、Pythonのデバッガーを使用：

```bash
cd edinet2dataset
uv run python -m pdb scripts/download_company_10years.py \
  --edinet_code E02144 \
  --years 1
```

## よくある質問

### Q: どのくらい時間がかかりますか？

A: 企業によって異なりますが、10年分で約5-15分程度です。ネットワーク速度とEDINET APIの応答速度に依存します。

### Q: ダウンロードしたデータはどこに保存されますか？

A: `data/{EDINET_CODE}/`ディレクトリに保存されます。デフォルトでは`data/`ディレクトリですが、`--output_dir`オプションで変更できます。

### Q: 既にダウンロード済みのファイルは再ダウンロードされますか？

A: はい、既存のファイルも上書きされます。メタデータは毎回更新されます。

### Q: 複数の企業のデータを取得できますか？

A: はい、異なるEDINETコードで複数回実行してください：

```bash
uv run python scripts/download_company_10years.py --edinet_code E02144 --years 10
uv run python scripts/download_company_10years.py --edinet_code E00324 --years 10
```

## 次のステップ

ローカルでのテストが成功したら、GitHub Actionsワークフローを実行できます。

1. GitHub Secretsに`EDINET_API_KEY`を設定
2. GitHub Actionsでワークフローを実行
3. 結果を確認

詳細は `GITHUB_ACTIONS_SETUP.md` を参照してください。
