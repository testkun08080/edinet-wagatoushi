# edinet-wrapper

`edinet2dataset` モジュールを使用するためのラッパープロジェクトです。

`edinet2dataset` は他の人のコードなので触らずに、このプロジェクト内でモジュールとして使用できます。

## プロジェクト構造

```
edinet-wagatoushi/
├── edinet2dataset/          # 他の人のコード（Git submodule、触らない）
│   ├── src/
│   │   └── edinet2dataset/
│   └── pyproject.toml
│
├── edinet-wrapper/          # このプロジェクト（自分のコード）
│   ├── src/
│   │   └── edinet_wrapper/
│   │       └── __init__.py  # edinet2datasetのラッパー
│   ├── scripts/             # 自分のスクリプトをここに配置
│   │   └── example_usage.py
│   ├── pyproject.toml
│   └── README.md
│
└── edinet-screener/         # 既存のTypeScriptプロジェクト
```

## セットアップ

### 1. Git Submoduleの設定（初回のみ）

`edinet2dataset` をGit submoduleとして設定する場合：

```bash
# リポジトリのルートで実行
cd /Users/dangpee/Git/edinet-wagatoushi

# edinet2datasetが既に存在する場合、submoduleとして追加
# （edinet2datasetのGitリポジトリURLが必要）
# git submodule add <repository_url> edinet2dataset

# または、既存のディレクトリをsubmoduleとして設定
# git submodule init
# git submodule update
```

**注意**: 現在 `edinet2dataset` がGitリポジトリでない場合は、そのまま使用することもできます。

### 2. 依存関係のインストール

```bash
cd edinet-wrapper

# edinet2datasetを開発モードでインストール
pip install -e ../edinet2dataset

# edinet-wrapperをインストール
pip install -e .
```

または、`uv` を使用する場合：

```bash
cd edinet-wrapper
uv sync
```

### 3. 動作確認

```bash
# インポートテストを実行
python scripts/test_import.py

# サンプルスクリプトを実行
python scripts/example_usage.py
```

## 使用方法

### 方法1: edinet_wrapper経由でインポート（推奨）

```python
from edinet_wrapper import parse_tsv, FinancialData, download_edinetinfo_csv

# 使用例
financial_data = parse_tsv("path/to/file.tsv")
```

### 方法2: 直接edinet2datasetをインポート

```python
from edinet2dataset.parser import parse_tsv, FinancialData
from edinet2dataset.downloader import download_edinetinfo_csv

# 使用例
financial_data = parse_tsv("path/to/file.tsv")
```

## 自分のスクリプトの配置

`scripts/` ディレクトリに自分のスクリプトを配置してください。

例：
```bash
edinet-wrapper/
└── scripts/
    ├── example_usage.py      # サンプル
    ├── my_analysis.py        # 自分の分析スクリプト
    └── my_download.py        # 自分のダウンロードスクリプト
```

スクリプト内では以下のようにインポートできます：

```python
# scripts/my_analysis.py
from edinet_wrapper import parse_tsv, FinancialData

def main():
    # 自分の処理を書く
    pass

if __name__ == "__main__":
    main()
```

## 注意事項

1. **edinet2datasetは触らない**: `edinet2dataset/` ディレクトリ内のファイルは編集しないでください。

2. **パスの問題**: `edinet2dataset` 内のスクリプトが相対パスを使用している場合、動作に影響する可能性があります。必要に応じて環境変数や設定ファイルでパスを調整してください。

3. **データディレクトリ**: `edinet2dataset/data/` へのアクセスが必要な場合は、パスを適切に設定してください。

4. **依存関係**: `edinet2dataset` の依存関係（polars, loguru等）も自動的にインストールされます。

## Git Submoduleの管理

### Submoduleの更新

```bash
# edinet2datasetを最新の状態に更新
git submodule update --remote edinet2dataset
```

### Submoduleの初期化（他のマシンでクローンした場合）

```bash
# リポジトリをクローンした後
git submodule init
git submodule update
```

または、一度に：

```bash
git clone --recursive <repository_url>
```

## トラブルシューティング

### インポートエラーが発生する場合

```bash
# edinet2datasetが正しくインストールされているか確認
pip list | grep edinet2dataset

# 再インストール
pip install -e ../edinet2dataset
```

### パスの問題

`edinet2dataset` 内のスクリプトが相対パスを使用している場合、実行時のカレントディレクトリに注意してください。

```python
# スクリプト内でパスを明示的に指定
from pathlib import Path
base_dir = Path(__file__).parent.parent.parent
edinet_data_dir = base_dir / "edinet2dataset" / "data"
```
