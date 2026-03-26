# edinet-wrapper セットアップガイド

## 前提条件

- Python 3.10 以上
- **uv**（推奨）または pip

---

## 方法 A: uv を使ったセットアップ（推奨）

**1 コマンドで** edinet2dataset と edinet-wrapper の両方が入ります。

```bash
cd edinet-wrapper
uv sync
```

これで完了です。スクリプトの実行は次のいずれかで行います。

```bash
uv run python scripts/example_usage.py
# または
uv run python scripts/test_import.py
```

- サブモジュール `../edinet2dataset` は **データセット構築用**（SakanaAI/edinet2dataset）を指している必要があります。**中身が EDINET-Bench のままだと** `Package metadata name 'edinet-bench' does not match given name 'edinet2dataset'` となり `uv sync` が失敗します。その場合は下記「サブモジュールの実体を入れ替える」を実行してください。

---

## これについて詳しく（uv で「1 コマンド」で済む理由）

### なぜいままでは「2 段階」だったか

edinet-wrapper は **edinet2dataset** という別パッケージ（親ディレクトリのサブモジュール）に依存しています。以前の手順では:

1. `pip install -e ../edinet2dataset` で edinet2dataset を先にインストール
2. `pip install -e .` で edinet-wrapper をインストール

という **2 段階**でした。これは「edinet2dataset を pyproject.toml の依存に書けない」前提だったためです。

### uv だとどうなるか

`pyproject.toml` に **パス依存** を書いてあります。

```toml
[tool.uv.sources]
edinet2dataset = { path = "../edinet2dataset", editable = true }
```

- `path = "../edinet2dataset"` … edinet-wrapper から見た「1 つ上のディレクトリの edinet2dataset」を指します（サブモジュールの場所）。
- `editable = true` … 開発モードで入るため、edinet2dataset 側を編集するとそのまま反映されます。

uv は `uv sync` 実行時にこの指定を読むので、

- **edinet2dataset** を `../edinet2dataset` から解決
- **edinet-wrapper** の依存をインストール

を **同時に** やってくれます。そのため **`uv sync` 1 回** でセットアップ完了です。

### まとめ

| やり方         | コマンド                                                                     |
| -------------- | ---------------------------------------------------------------------------- |
| **uv（推奨）** | `cd edinet-wrapper && uv sync` → その後 `uv run python scripts/...`          |
| pip            | `pip install -e ../edinet2dataset` → `pip install -e .`（従来どおり 2 段階） |

---

### サブモジュールの実体を入れ替える（`edinet-bench` エラーが出る場合）

`.gitmodules` の URL は正しくても、**ディレクトリの中身**がまだ EDINET-Bench（評価用）のままだと、uv が「パッケージ名が edinet2dataset ではない」とエラーにします。**構築用リポジトリ**の中身で入れ替えてください。

**リポジトリルート**（`edinet-wagatoushi/`）で実行:

```bash
git submodule deinit -f edinet2dataset
git add .gitmodules
git rm -f edinet2dataset
git submodule add https://github.com/SakanaAI/edinet2dataset edinet2dataset
git submodule update --init --recursive
```

- `git rm` で「already exists in the index」や「please stage your changes to .gitmodules」と出る場合: 上記の **`git add .gitmodules`** を先に実行してから `git rm -f edinet2dataset` をやり直す。
- 「A git directory for 'edinet2dataset' is found locally」と出る場合: 古いサブモジュールのキャッシュが残っています。**リポジトリルート**で `rm -rf .git/modules/edinet2dataset` を実行してから、あらためて `git submodule add ...` を実行する。

完了後、`edinet2dataset/src/` に **`edinet2dataset`** フォルダ（`downloader.py`, `parser.py` など）があれば OK です。`edinet_bench` だけならまだ古い中身なので、上記を再度実行するか `git submodule update --remote edinet2dataset` を試してください。

---

## 方法 B: pip でのセットアップ（従来）

### ステップ 1: edinet2dataset を開発モードでインストール

```bash
cd edinet-wrapper
pip install -e ../edinet2dataset
```

### ステップ 2: edinet-wrapper をインストール

```bash
pip install -e .
```

### ステップ 3: 動作確認

```bash
python scripts/example_usage.py
```

## Git Submodule として設定する場合

### 初回設定

`edinet2dataset` を Git submodule として管理する場合：

```bash
# リポジトリのルートディレクトリで実行
cd /Users/dangpee/Git/edinet-wagatoushi

# edinet2datasetのGitリポジトリURLを取得してsubmoduleとして追加
# （例: https://github.com/SakanaAI/EDINET-Bench.git）
git submodule add <repository_url> edinet2dataset

# submoduleを初期化・更新
git submodule update --init --recursive
```

### 既存のディレクトリを Submodule 化する場合

既に `edinet2dataset` ディレクトリが存在する場合：

```bash
# 1. 既存のディレクトリを一時的にリネーム
mv edinet2dataset edinet2dataset_backup

# 2. submoduleとして追加
git submodule add <repository_url> edinet2dataset

# 3. 必要に応じて既存のファイルをコピー
# （ただし、Git管理下のファイルは上書きされるので注意）
```

### Submodule の更新

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

### uv を使う場合

**方法 A: uv を使ったセットアップ** を参照してください。`uv sync` だけで済みます。

## 開発時の注意事項

1. **edinet2dataset は触らない**: `edinet2dataset/` ディレクトリ内のファイルは編集しないでください。

2. **自分のコードは edinet-wrapper 内に配置**: すべてのスクリプトは `edinet-wrapper/scripts/` または `edinet-wrapper/src/edinet_wrapper/` に配置してください。

3. **依存関係の管理**: `edinet2dataset` の依存関係は自動的にインストールされますが、追加の依存関係が必要な場合は `pyproject.toml` に追加してください。
