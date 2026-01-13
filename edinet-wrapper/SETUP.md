# edinet-wrapper セットアップガイド

## 前提条件

- Python 3.10以上
- pip または uv

## セットアップ手順

### ステップ1: edinet2datasetを開発モードでインストール

`edinet-wrapper` ディレクトリから、親ディレクトリの `edinet2dataset` を開発モードでインストールします。

```bash
cd edinet-wrapper
pip install -e ../edinet2dataset
```

これにより、`edinet2dataset` がモジュールとして使用可能になります。

### ステップ2: edinet-wrapperをインストール

```bash
# edinet-wrapperディレクトリ内で
pip install -e .
```

### ステップ3: 動作確認

```bash
# サンプルスクリプトを実行
python scripts/example_usage.py
```

## Git Submoduleとして設定する場合

### 初回設定

`edinet2dataset` をGit submoduleとして管理する場合：

```bash
# リポジトリのルートディレクトリで実行
cd /Users/dangpee/Git/edinet-wagatoushi

# edinet2datasetのGitリポジトリURLを取得してsubmoduleとして追加
# （例: https://github.com/SakanaAI/EDINET-Bench.git）
git submodule add <repository_url> edinet2dataset

# submoduleを初期化・更新
git submodule update --init --recursive
```

### 既存のディレクトリをSubmodule化する場合

既に `edinet2dataset` ディレクトリが存在する場合：

```bash
# 1. 既存のディレクトリを一時的にリネーム
mv edinet2dataset edinet2dataset_backup

# 2. submoduleとして追加
git submodule add <repository_url> edinet2dataset

# 3. 必要に応じて既存のファイルをコピー
# （ただし、Git管理下のファイルは上書きされるので注意）
```

### Submoduleの更新

```bash
# edinet2datasetを最新の状態に更新
cd edinet2dataset
git pull origin main  # または master

# または、ルートディレクトリから
git submodule update --remote edinet2dataset
```

### 他のマシンでクローンする場合

```bash
# リポジトリをクローン（submoduleも含める）
git clone --recursive <repository_url>

# または、後からsubmoduleを初期化
git clone <repository_url>
cd edinet-wagatoushi
git submodule init
git submodule update
```

## トラブルシューティング

### インポートエラー: ModuleNotFoundError: No module named 'edinet2dataset'

```bash
# edinet2datasetがインストールされているか確認
pip list | grep edinet2dataset

# 再インストール
pip install -e ../edinet2dataset
```

### パスの問題

`edinet2dataset` 内のスクリプトが相対パスを使用している場合、実行時のカレントディレクトリに注意してください。

```python
# スクリプト内でパスを明示的に指定
from pathlib import Path

# プロジェクトルートを取得
project_root = Path(__file__).parent.parent.parent
edinet_data_dir = project_root / "edinet2dataset" / "data"
```

### uvを使用する場合

```bash
# uvでインストール
cd edinet-wrapper
uv pip install -e ../edinet2dataset
uv pip install -e .
```

## 開発時の注意事項

1. **edinet2datasetは触らない**: `edinet2dataset/` ディレクトリ内のファイルは編集しないでください。

2. **自分のコードはedinet-wrapper内に配置**: すべてのスクリプトは `edinet-wrapper/scripts/` または `edinet-wrapper/src/edinet_wrapper/` に配置してください。

3. **依存関係の管理**: `edinet2dataset` の依存関係は自動的にインストールされますが、追加の依存関係が必要な場合は `pyproject.toml` に追加してください。
