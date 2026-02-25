# EDINET API を Postman で叩く（四半期・年次・大量保有報告書）

API キーは [EDINET API](https://api.edinet-fsa.go.jp/api/auth/index.aspx?mode=1) で取得し、`Subscription-Key` に設定してください。

---

## 1. 書類一覧 API（指定日の提出書類一覧を取得）

**目的**: 指定した日付に提出された書類の一覧を取得。ここで得た `docID` を後で「書類取得 API」に渡す。

### リクエスト

| 項目 | 値 |
|------|-----|
| **Method** | GET |
| **URL** | `https://api.edinet-fsa.go.jp/api/v2/documents.json` |

### Query パラメータ

| キー | 値 | 説明 |
|------|-----|------|
| `date` | `2024-06-28` | ファイル日付（YYYY-MM-DD）。この日に提出された書類が返る。 |
| `type` | `2` | 1=メタデータのみ、**2=提出書類一覧＋メタデータ**（一覧取得時は 2） |
| `Subscription-Key` | あなたの API キー | 必須 |

### Postman での設定例

- URL: `https://api.edinet-fsa.go.jp/api/v2/documents.json`
- Params:
  - `date` = `2024-06-28`
  - `type` = `2`
  - `Subscription-Key` = `（発行した API キー）`

### cURL 例

```bash
curl -G "https://api.edinet-fsa.go.jp/api/v2/documents.json" \
  --data-urlencode "date=2024-06-28" \
  --data-urlencode "type=2" \
  --data-urlencode "Subscription-Key=YOUR_API_KEY"
```

### レスポンスで書類種別を判別する

JSON の `results[]` の各要素に `docTypeCode` があります。この値で「年次／四半期／大量保有」を判定します。

| docTypeCode | 書類 |
|-------------|------|
| **120** | 有価証券報告書（**年次報告書**） |
| **140** | **四半期報告書** |
| **350** | **大量保有報告書** |

例: 四半期報告書だけ使う場合は、`results` のうち `docTypeCode === "140"` の要素の `docID` を使う。

---

## 2. 書類取得 API（PDF / CSV 等をダウンロード）

**目的**: 書類一覧 API で得た `docID` を指定し、PDF や CSV（TSV）を取得する。

### リクエスト

| 項目 | 値 |
|------|-----|
| **Method** | GET |
| **URL** | `https://api.edinet-fsa.go.jp/api/v2/documents/{docID}` |

`{docID}` は書類一覧 API の `results[].docID`（例: `S100ABCD`）。

### Query パラメータ

| キー | 値 | 説明 |
|------|-----|------|
| `type` | `1` / `2` / `5` など | **1**=XBRL等、**2**=PDF、**5**=CSV |
| `Subscription-Key` | あなたの API キー | 必須 |

### type 一覧

| type | 取得内容 |
|------|----------|
| 1 | 提出本文書・監査報告書（ZIP: XBRL 等） |
| 2 | **PDF** |
| 3 | 代替書面・添付文書（ZIP） |
| 4 | 英文ファイル（ZIP） |
| 5 | **CSV**（ZIP、XBRL→CSV） |

### Postman での設定例（PDF を取得）

- URL: `https://api.edinet-fsa.go.jp/api/v2/documents/S100ABCD`
  - `S100ABCD` は書類一覧 API で取得した実際の docID に置き換え
- Params:
  - `type` = `2`
  - `Subscription-Key` = `（API キー）`
- **Send** 後、PDF なら「Save Response」→「Save to a file」で保存

### cURL 例（PDF）

```bash
# docID は書類一覧 API の results[].docID から取得
curl -G "https://api.edinet-fsa.go.jp/api/v2/documents/S100ABCD" \
  --data-urlencode "type=2" \
  --data-urlencode "Subscription-Key=YOUR_API_KEY" \
  -o document.pdf
```

### cURL 例（CSV）

```bash
curl -G "https://api.edinet-fsa.go.jp/api/v2/documents/S100ABCD" \
  --data-urlencode "type=5" \
  --data-urlencode "Subscription-Key=YOUR_API_KEY" \
  -o document_csv.zip
```

---

## 3. 流れのまとめ（四半期・年次・大量保有を叩く手順）

1. **書類一覧 API** を叩く  
   - `date` に調べたい日（例: 決算期の提出が多そうな日）を指定  
   - `type=2` で一覧取得  

2. レスポンスの **`results`** を確認  
   - **年次**: `docTypeCode === "120"`  
   - **四半期**: `docTypeCode === "140"`  
   - **大量保有**: `docTypeCode === "350"`  

3. 欲しい書類の **`docID`** をコピー  

4. **書類取得 API** を叩く  
   - URL に `docID` を入れる  
   - `type=2` で PDF、`type=5` で CSV  

---

## 4. 日付のヒント

- **年次（有価証券報告書）**: 提出は決算後一定期間内。多くの会社は 4〜6 月に集中。
- **四半期報告書**: 四半期決算後に提出。同様に決算月の翌月あたりの日付を指定すると件数が多い。
- **大量保有報告書**: 5% ルール等で随時提出。特定の日より「ある程度幅のある期間」で一覧を何日分か叩いて docID を集める運用が現実的。

例: 2024年6月28日分の一覧を取得 → `results` 内の `docTypeCode` で 120 / 140 / 350 を絞り、その `docID` で書類取得 API を叩く。
