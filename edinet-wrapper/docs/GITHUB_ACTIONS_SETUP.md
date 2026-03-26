# GitHub Actions セットアップガイド

企業の10年間分のデータを自動取得・保存するGitHub Actionsワークフローをセットアップしました。

## 作成されたファイル

1. **`scripts/download/download_company_10years.py`**: 10年間分のデータをダウンロードするスクリプト
2. **`.github/workflows/download_company_data.yml`**: GitHub Actionsワークフローファイル
3. **`.github/workflows/README.md`**: ワークフローの使用方法
4. **`scripts/download/README_DOWNLOAD.md`**: スクリプトの使用方法

## セットアップ手順

### 1. GitHub Secretsの設定

1. GitHubリポジトリの「Settings」→「Secrets and variables」→「Actions」に移動
2. 「New repository secret」をクリック
3. 以下のシークレットを追加：
   - **Name**: `EDINET_API_KEY`
   - **Value**: EDINET APIキー
     - 取得方法: [EDINET公式サイト](https://disclosure2dl.edinet-fsa.go.jp/guide/static/disclosure/WZEK0110.html)

### 2. ワークフローの実行

#### 手動実行（推奨）

1. GitHubリポジトリの「Actions」タブに移動
2. 左サイドバーから「Download Company Data (10 Years)」を選択
3. 「Run workflow」ボタンをクリック
4. パラメータを入力：
   - **EDINETコード**: 例: `E02144` (トヨタ自動車)
   - **ファイル形式**: `tsv` (推奨), `pdf`, または `xbrl`
   - **年数**: `10` (デフォルト)
5. 「Run workflow」をクリック

#### スケジュール実行

毎週月曜日の午前3時（JST）に自動実行されます（デフォルト: トヨタ自動車 E02144）。

## 実行例

### トヨタ自動車のデータを取得

```
EDINETコード: E02144
ファイル形式: tsv
年数: 10
```

### ソニーグループのデータを取得

```
EDINETコード: E00324
ファイル形式: tsv
年数: 10
```

## 出力

ダウンロードされたデータは以下のディレクトリ構造で保存されます：

```
data/
└── {EDINET_CODE}/
    ├── metadata.json          # メタデータ
    ├── {docID1}.tsv          # 有価証券報告書
    ├── {docID2}.tsv
    └── ...
```

### メタデータの例

```json
{
  "edinet_code": "E02144",
  "download_date": "2025-01-15T10:30:00",
  "date_range": {
    "start": "2015-01-15",
    "end": "2025-01-15"
  },
  "total_documents": 10,
  "documents": [
    {
      "docID": "S100TR7I",
      "docDescription": "有価証券報告書－第82期(2023/04/01－2024/03/31)",
      "periodStart": "2023-04-01",
      "periodEnd": "2024-03-31",
      "submitDateTime": "2024-06-25 09:00",
      "file_type": "tsv"
    }
  ]
}
```

## ローカルでの実行

GitHub Actionsを使わずにローカルで実行する場合：

```bash
cd edinet-wrapper
export EDINET_API_KEY="your-api-key"
uv run python scripts/download/download_company_10years.py \
  --edinet_code E02144 \
  --file_type tsv \
  --years 10
```

## 主要なEDINETコード

| 企業名 | EDINETコード |
|--------|-------------|
| トヨタ自動車 | E02144 |
| ソニーグループ | E00324 |
| パナソニック | E00325 |
| 日立製作所 | E00326 |
| 三菱電機 | E00327 |

企業コードの検索方法：

```bash
cd edinet2dataset
uv run python src/edinet2dataset/downloader.py --query "企業名"
```

## 注意事項

1. **API制限**: EDINET APIは過去10年分のデータのみ提供
2. **レート制限**: 大量のリクエストを送信しないよう注意
3. **タイムアウト**: ワークフローは最大60分でタイムアウト
4. **データサイズ**: 大量のデータをダウンロードする場合、リポジトリサイズに注意
5. **.gitignore**: `data/`ディレクトリは`.gitignore`で無視されていますが、ワークフローでは強制的に追加されます

## トラブルシューティング

詳細は `.github/workflows/README.md` を参照してください。
