# edinet2dataset_old からの移行完了

`edinet2dataset_old` の内容を `edinet-wrapper` に移行しました。

## 移行された内容

### スクリプトファイル

- `scripts/` ディレクトリに以下のスクリプトを移行:
  - `analyze_data_structure.py`
  - `analyze_tsv_structure.py`
  - `create_sample_data.py`
  - `download_company_10years.py`
  - `prepare_edinet_corpus.py`
  - `scripts/earnings_forecast/prepare_dataset.py`
  - `scripts/fraud_detection/` 配下のスクリプト
  - `scripts/industry_prediction/prepare_dataset.py`
  - その他のスクリプト

### データディレクトリ

- `data/` - EDINET データファイル
- `dataset/` - 生成されたデータセット
- `edinet_corpus/` - EDINET コーパス
- `fraud_detection/` - 不正検出関連データ

### ドキュメント

- `DATA_STRUCTURE_ANALYSIS.md`
- `GITHUB_ACTIONS_SETUP.md`
- `LOCAL_TESTING.md`
- `QUICK_START.md`
- `README.md` (元の README)
- `sample_data_structure.json`
- `tsv_structure_analysis.json`

## 修正した内容

### パス参照の修正

以下のスクリプトでパス参照を修正しました:

1. **analyze_data_structure.py**

   - `sys.path.insert` を削除（edinet2dataset は開発モードでインストール済み）
   - `data/` への相対パスを `Path(__file__).parent.parent / "data"` に変更

2. **download_company_10years.py**

   - `sys.path.insert` を削除
   - `project_root` の計算を `edinet-wrapper` のルートに変更

3. **create_sample_data.py**

   - `data/` への相対パスを修正
   - 出力ファイルのパスを修正

4. **analyze_tsv_structure.py**

   - `data/` への相対パスを修正

5. **industry_prediction/prepare_dataset.py**
   - `data/industry_revision.txt` へのパスを修正
   - `Path` のインポートを追加

## 注意事項

1. **edinet2dataset のインストール**: スクリプトを実行する前に、`edinet2dataset` を開発モードでインストールしてください:

   ```bash
   pip install -e ../edinet2dataset
   ```

2. **パスの変更**: 一部のスクリプトで、データディレクトリへのパスが変更されています。スクリプト内で相対パスを使用している場合は、`edinet-wrapper` のルートディレクトリから実行してください。

3. **既存のスクリプト**: すべてのスクリプトが新しい構造で動作するように修正されていますが、個別にテストすることを推奨します。

## 次のステップ

1. 各スクリプトを個別にテスト
2. 必要に応じて追加のパス修正
3. `edinet2dataset_old` のバックアップを保持（必要に応じて削除可能）
