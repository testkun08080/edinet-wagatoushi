# edinet2dataset モジュール化計画

## 現状の課題

- `edinet2dataset/` は他の人のコードで、触りたくない
- しかし、このモジュールの機能（パーサー、ダウンローダーなど）を使いたい
- 自分のコードとは別で管理したい

## 推奨アプローチ

### アプローチ 1: 開発モードインストール + 独立プロジェクト構成（推奨）

**メリット:**

- `edinet2dataset` を完全に独立したパッケージとして扱える
- 自分のコードを別ディレクトリで管理できる
- 依存関係が明確になる
- 将来的に `edinet2dataset` が PyPI に公開された場合も対応しやすい

**構成:**

```
edinet-wagatoushi/
├── edinet2dataset/          # 他の人のコード（触らない）
│   ├── src/
│   │   └── edinet2dataset/
│   └── pyproject.toml
│
├── my-project/              # 自分のコード（新規作成）
│   ├── src/
│   │   └── my_project/
│   │       └── main.py     # edinet2datasetをインポートして使用
│   ├── pyproject.toml      # edinet2datasetを依存関係に追加
│   └── README.md
│
└── edinet-screener/         # 既存のTypeScriptプロジェクト
```

**手順:**

1. `my-project/` ディレクトリを作成
2. `my-project/pyproject.toml` を作成し、`edinet2dataset` をローカルパス依存として追加
3. `edinet2dataset` を開発モードでインストール: `pip install -e ../edinet2dataset`
4. 自分のコードで `from edinet2dataset.parser import parse_tsv` のようにインポート

---

### アプローチ 2: Git Submodule + 独立プロジェクト構成

**メリット:**

- `edinet2dataset` を完全に別リポジトリとして管理できる
- バージョン管理が明確

**デメリット:**

- Git submodule の管理が少し複雑
- ローカル開発ではアプローチ 1 の方が簡単

**構成:**

```
edinet-wagatoushi/
├── edinet2dataset/          # Git submodule（他の人のリポジトリ）
├── my-project/              # 自分のコード
└── edinet-screener/         # 既存のTypeScriptプロジェクト
```

---

### アプローチ 3: ラッパーモジュールの作成

**メリット:**

- 既存の構造を大きく変えなくて良い
- `edinet2dataset` の機能をラップして、より使いやすい API を提供できる

**構成:**

```
edinet-wagatoushi/
├── edinet2dataset/          # 他の人のコード（触らない）
├── edinet-wrapper/          # 自分のラッパーモジュール（新規作成）
│   ├── src/
│   │   └── edinet_wrapper/
│   │       ├── __init__.py
│   │       └── api.py       # edinet2datasetをラップ
│   └── pyproject.toml
└── edinet-screener/
```

---

## 推奨実装: アプローチ 1

### ステップ 1: 新しいプロジェクトディレクトリの作成

```bash
mkdir my-project
cd my-project
```

### ステップ 2: pyproject.toml の作成

```toml
[project]
name = "my-edinet-project"
version = "0.1.0"
description = "My project using edinet2dataset"
requires-python = ">= 3.10"
dependencies = [
    "edinet2dataset @ file:///${PROJECT_ROOT}/../edinet2dataset",
    # または開発モードインストール後は単に:
    # "edinet2dataset",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

### ステップ 3: 開発モードインストール

```bash
# edinet2datasetを開発モードでインストール
pip install -e ../edinet2dataset

# 自分のプロジェクトをインストール
pip install -e .
```

### ステップ 4: 使用例

```python
# my-project/src/my_project/main.py
from edinet2dataset.parser import parse_tsv, FinancialData
from edinet2dataset.downloader import download_edinetinfo_csv

# edinet2datasetの機能を使用
financial_data = parse_tsv("path/to/file.tsv")
```

---

## 注意事項

1. **パスの問題**: `edinet2dataset` 内のスクリプトが相対パスを使用している場合、動作に影響する可能性がある
2. **依存関係**: `edinet2dataset` の依存関係（polars, loguru 等）も必要
3. **データディレクトリ**: `edinet2dataset/data/` へのアクセスが必要な場合は、パスを適切に設定

---

---

## 採用したアプローチ: アプローチ 2 + ラッパーモジュール

**決定**: Git Submodule 方式 + `edinet-wrapper` ディレクトリ構成

**実装済み構成:**

```
edinet-wagatoushi/
├── edinet2dataset/          # 他の人のコード（Git submodule、触らない）
│   ├── src/
│   │   └── edinet2dataset/
│   └── pyproject.toml
│
├── edinet-wrapper/          # 自分のコード（実装済み）
│   ├── src/
│   │   └── edinet_wrapper/
│   │       └── __init__.py  # edinet2datasetのラッパー
│   ├── scripts/             # 自分のスクリプトをここに配置
│   │   └── example_usage.py
│   ├── pyproject.toml
│   ├── README.md
│   └── SETUP.md
│
└── edinet-screener/         # 既存のTypeScriptプロジェクト
```

**セットアップ手順:**

1. `edinet2dataset` を開発モードでインストール:

   ```bash
   cd edinet-wrapper
   pip install -e ../edinet2dataset
   ```

2. `edinet-wrapper` をインストール:

   ```bash
   pip install -e .
   ```

3. 自分のスクリプトを `edinet-wrapper/scripts/` に配置

詳細は `edinet-wrapper/README.md` と `edinet-wrapper/SETUP.md` を参照してください。

---

## 次のステップ

✅ プロジェクト構造を作成（完了）
✅ 依存関係を設定（完了）
⏭️ 動作確認（ユーザーが実行）
⏭️ Git submodule 設定（必要に応じて）
