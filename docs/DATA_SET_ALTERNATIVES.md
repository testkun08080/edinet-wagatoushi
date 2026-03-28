# data-set の運用（レポに載せない場合）

`data-set` は容量が大きいためリポジトリに含めません（`.gitignore` 済み）。**データセットをどこかにホストしておき、ビルド時にその URL を参照して取得 → 抽出 → ビルド**する運用が可能です。ローカルに置きっぱなしにしなくてよいです。

---

## リモートのデータセットを参照してビルドする（推奨）

データセットを **zip または tar.gz でどこかに置き**、ビルド時に環境変数 **`DATA_SET_URL`** でその URL を指定すると、未取得のときだけダウンロードしてから `public/data` を生成し、Vike ビルドします。

### 環境変数

| 変数 | 説明 |
|------|------|
| **DATA_SET_URL** | データセットの zip / tar.gz の URL。設定すると、data-set が無い場合にここから取得する。 |
| **DATA_SET_PATH** | 展開先ディレクトリ（未指定時はプロジェクトルートの `data-set/`）。 |
| **FORCE_DOWNLOAD** | `1` のとき、既存の data-set があっても再取得する。 |

### 使い方

```bash
cd edinet-screener

# 例: GitHub Release の zip を指定してビルド
DATA_SET_URL="https://github.com/<org>/edinet-wagatoushi/releases/download/v0.1.0/data-set.zip" npm run build

# 例: S3 の presigned URL を指定（.env に書いてもよい）
export DATA_SET_URL="https://your-bucket.s3.amazonaws.com/data-set.tar.gz?X-Amz-..."
npm run build
```

- **data-set が既にローカルにある場合**: ダウンロードはスキップされ、そのまま抽出 → ビルド。
- **DATA_SET_URL を付けない場合**: 従来どおり「ローカルに data-set があればそれを使い、無ければスキップ」です。

### 利用しているスクリプト

- **edinet-screener/scripts/fetch-dataset.sh** … `DATA_SET_URL` から zip/tar.gz を取得して `data-set/`（または `DATA_SET_PATH`）に展開。
- **edinet-screener/scripts/generate-data.sh** … `DATA_SET_URL` が設定されていて data-set が無ければ `fetch-dataset.sh` を実行し、その後 `scripts/frontend/build_screener_data.py` で `public/data` を生成。
- **edinet-wrapper/scripts/frontend/build_screener_data.py** は、`--data_set` または環境変数 **DATA_SET_PATH** で入力 data-set を切り替えられます（未指定時は既定の `data-set/` を参照）。

---

## データセットをどこに置くか（ホスティング案）

いずれも **zip または tar.gz で data-set の中身を固めたファイルの URL** を `DATA_SET_URL` に渡せばビルドで参照できます。

| 置き場所 | 概要 |
|----------|------|
| **GitHub Release** | リポジトリの Release に zip を1つアップロードし、`https://github.com/<org>/<repo>/releases/download/<tag>/data-set.zip` を `DATA_SET_URL` に指定。更新は手動。 |
| **AWS S3 / GCS / Azure Blob** | バケットに zip を置き、公開 URL または presigned URL を `DATA_SET_URL` に指定。CI では IAM やサービスアカウントで取得。 |
| **Hugging Face Hub** | Dataset をアップロードし、ファイルのダウンロード URL（例: `https://huggingface.co/datasets/org/name/resolve/main/data-set.zip`）を `DATA_SET_URL` に指定。または `huggingface-cli download` で一度落として zip を作り、別のストレージに置いても可。 |
| **自前サーバー / CDN** | zip を配置し、その URL を `DATA_SET_URL` に指定。 |

ローカルに置きっぱなしにしない運用にするなら、上記のいずれかにデータセットをアップロードし、ビルド時（手元・CI 両方）で `DATA_SET_URL` を設定して `npm run build` すれば、その都度参照してビルドできます。

---

## その他の運用

- **ローカルに data-set を置く**: 従来どおりプロジェクトルートの `data-set/` に置けば、`DATA_SET_URL` なしで `npm run build` でそのまま利用されます。
- **data-set を一切使わない**: データ生成をスキップしてビルドする場合は `npm run build:app`。既存の `public/data`（コミット済みサンプル等）のままビルドされます。
