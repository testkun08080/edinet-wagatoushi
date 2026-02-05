# 企業データダウンロードスクリプト

## `download_company_10years.py`

指定された企業の10年間分の有価証券報告書をダウンロードするスクリプトです。

## 使用方法

### 基本的な使い方

```bash
cd edinet2dataset
uv run python scripts/download_company_10years.py \
  --edinet_code E02144 \
  --output_dir data \
  --file_type tsv \
  --years 10
```

### パラメータ

- `--edinet_code` (必須): 企業のEDINETコード（例: `E02144`）
- `--output_dir` (オプション): 出力ディレクトリ（デフォルト: `data`）
- `--file_type` (オプション): ダウンロードするファイル形式
  - `tsv` (推奨): TSV形式の財務データ
  - `pdf`: PDF形式の有価証券報告書
  - `xbrl`: XBRL形式の生データ
- `--years` (オプション): 取得する年数（デフォルト: `10`）

### 環境変数

- `EDINET_API_KEY`: EDINET APIキー（必須）

### 実行例

#### トヨタ自動車の10年間分のTSVデータを取得

```bash
export EDINET_API_KEY="your-api-key"
uv run python scripts/download_company_10years.py \
  --edinet_code E02144 \
  --file_type tsv \
  --years 10
```

#### ソニーグループの5年間分のPDFデータを取得

```bash
export EDINET_API_KEY="your-api-key"
uv run python scripts/download_company_10years.py \
  --edinet_code E00324 \
  --file_type pdf \
  --years 5
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

### メタデータの構造

`metadata.json`には以下の情報が含まれます：

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
    },
    ...
  ]
}
```

## 注意事項

1. **EDINET APIキー**: スクリプト実行前に`EDINET_API_KEY`環境変数を設定してください
2. **API制限**: EDINET APIは過去10年分のデータのみ提供しています
3. **レート制限**: 大量のリクエストを送信しないよう、適切な間隔を空けて実行してください
4. **データの有無**: 指定期間内に有価証券報告書が提出されていない場合、データが取得できないことがあります

## トラブルシューティング

### EDINET APIキーが設定されていない

```
Error: EDINET_API_KEY environment variable is not set
```

**解決方法**: 環境変数`EDINET_API_KEY`を設定してください。

### データが見つからない

```
Warning: No documents found for E02144 in the specified period
```

**原因**: 
- EDINETコードが間違っている
- 指定期間内に有価証券報告書が提出されていない

**解決方法**: 
- EDINETコードを確認（`scripts/prepare_edinet_corpus.py`の`search_company`関数を使用）
- 期間を調整（年数を増やす）

### ダウンロードエラー

特定の書類のダウンロードに失敗した場合、エラーログが出力されますが、処理は続行されます。成功した書類のみが保存されます。
