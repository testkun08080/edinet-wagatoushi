# EDINET 高負荷の原因調査まとめ

GHA（GitHub Actions）で edinet-wrapper を使用した際に EDINET API へ高負荷がかかっている原因を調査した結果です。

---

## 1. 結論（要約）

| 要因 | 内容 |
|------|------|
| **複数ジョブの同時実行** | 1 ワークフローで「月」単位の matrix により、最大 12 ジョブが同時に走る |
| **バッチ一括起動** | 年×書類種別の組み合わせで多数のワークフローを 1 秒間隔で連続 dispatch → 数十〜数百ジョブが短時間に集中 |
| **日付ごとの一覧 API** | 1 ヶ月あたり約 28〜31 回の `documents.json` 呼び出し（日ごとに 1 リクエスト）、リクエスト間の待機なし |
| **並列ダウンロード** | 1 ジョブあたり最大 8 スレッドで TSV/PDF を同時取得。成功時はスリープなし |
| **レート制限の未実装** | 成功時リクエスト間のスリープやスロットルがなく、リトライ時のみ 60 秒待機 |

これらが重なり、**「同時実行ジョブ数 × 8 スレッド × 無待機」** で EDINET への同時リクエスト数が一気に増え、高負荷の主因になっています。

---

## 2. 原因の詳細

### 2.1 GHA ワークフロー側

#### 2.1.1 月単位 matrix による並列実行（`edinet_corpus.yml`）

- **ファイル**: `.github/workflows/edinet_corpus.yml`
- **挙動**:
  - `prepare` ジョブで月リスト（デフォルト 1〜12）を JSON で出力
  - `corpus` ジョブは `matrix.month` で **月ごとに 1 ジョブ**
  - `strategy` に `max-parallel` が**ない**ため、**12 ヶ月 = 最大 12 ジョブが同時実行**（GHA の同時実行上限まで）
- **影響**: 1 回のワークフロー実行で、複数ランナーから同時に EDINET へリクエストが飛ぶ。

#### 2.1.2 バッチワークフローによる一括起動（`edinet_corpus_batch.yml`）

- **ファイル**: `.github/workflows/edinet_corpus_batch.yml`
- **挙動**:
  - `start_year` 〜 `end_year` と `doc_types`（カンマ区切り）の組み合わせで、`edinet_corpus.yml` を **workflow_dispatch で繰り返し起動**
  - 各 dispatch の間に **1 秒だけ** `sleep 1` を入れている
  - 例: 2019–2024（6 年）× quarterly,semiannual,annual（3 種）= **18 ワークフロー**が短時間にキック
  - 各ワークフローがそれぞれ 12 ジョブ（月 matrix）を持つため、**最大 18×12 = 216 ジョブ**がキューに乗り、順次実行される
- **影響**: 実行開始直後に EDINET へのリクエストが時系列で集中し、負荷のピークが大きくなる。

### 2.2 ラッパー実装側

#### 2.2.1 書類一覧取得: 日付ごとに 1 リクエスト・待機なし

- **ファイル**: `edinet-wrapper/src/edinet_wrapper/downloader.py`
- **処理**: `get_results(start_date, end_date)`  
  - `make_day_list(start_date, end_date)` で **期間内の日付を 1 日ずつ**列挙  
  - 各日付で `get_response(base_url, day, type=2, key)` を 1 回呼び出し（`documents.json`）  
  - 1 ヶ月 ≈ 28〜31 日 → **1 ヶ月あたり 28〜31 回の API 呼び出し**
- **待機**: 成功時は **リクエスト間の `time.sleep` なし**。  
  失敗時のみ `_GET_RESPONSE_RETRY_DELAY = 60` 秒待ってリトライ。

結果として、1 ジョブで「約 30 回の連続リクエスト」が短時間に発生し、これが 12 ジョブ分並列で行われると、一覧取得だけでも 360 リクエスト程度がほぼ同時に発生し得る。

#### 2.2.2 書類 DL: 8 スレッド並列・成功時は無待機

- **ファイル**: `edinet-wrapper/scripts/download/prepare_edinet_corpus.py`
- **処理**:
  - `ThreadPoolExecutor(max_workers=8)` で **最大 8 スレッド**並列
  - 各タスクで 1 件の書類について  
    `download_document(..., "tsv", path)` と `download_document(..., "pdf", path)` の **2 回**呼び出し
  - 1 書類あたり TSV 用 API 1 回 + PDF 用 API 1 回
- **待機**: `downloader.py` の `_download_document_in_tsv` / `_download_document_in_pdf` には **成功時のスリープやスロットルはなし**。

したがって、1 ジョブあたり「最大 8 本の同時接続 × 各接続で連続リクエスト」が発生し、ジョブ数が増えると「ジョブ数 × 8」のオーダーで同時リクエスト数が増える。

#### 2.2.3 レート制限・スロットルの未実装

- **コードベース**: `time.sleep` は `downloader.py` の **リトライ時のみ**（上記 60 秒）。
- **通常時の制御**: 成功時リクエスト間の間隔や、同時実行数の上限（スロットル）は **実装されていない**。
- README には「並列リクエストは控えめに」とあるが、GHA と `max_workers=8` の組み合わせでは、実運用で「控えめ」になっていない。

---

## 3. 負荷のイメージ（定性的）

- **1 ジョブ（1 ヶ月分）**  
  - 一覧: 約 30 回の連続 `documents.json`  
  - 書類 DL: 件数 × 2（TSV+PDF）、8 並列で無待機  
  → ピーク時は 8 本の同時接続が継続
- **ワークフロー 1 回（12 ヶ月指定時）**  
  - 12 ジョブ並列 → 最大 12×8 = **96 本の同時接続**の可能性
- **バッチで 18 ワークフロー起動**  
  - 18 ワークフロー × 12 ジョブ = 216 ジョブがキュー  
  - GHA の同時実行数上限（例: 20）まで使うと、20×8 = **160 本の同時接続**が短時間に発生し得る

これが「EDINET への高負荷」として観測されている要因と整合的です。

---

## 4. 参照したファイル一覧

| 役割 | パス |
|------|------|
| 月単位実行・matrix | `.github/workflows/edinet_corpus.yml` |
| 一括 dispatch | `.github/workflows/edinet_corpus_batch.yml` |
| コーパス取得エントリ | `edinet-wrapper/scripts/download/edinet_corpus.sh` |
| 書類一覧・DL ロジック | `edinet-wrapper/scripts/download/prepare_edinet_corpus.py` |
| API 呼び出し・リトライ | `edinet-wrapper/src/edinet_wrapper/downloader.py` |
| 注意書き | `edinet-wrapper/README.md`（並列リクエスト控えめ） |

---

## 5. 今後の対策の方向性（参考）

原因を踏まえると、以下のような対策が考えられます。

1. **GHA の同時実行数を抑える**  
   - `edinet_corpus.yml` の `strategy` に `max-parallel: 2` などで、同時に走る「月」ジョブ数を制限する。
2. **バッチの dispatch 間隔を空ける**  
   - `edinet_corpus_batch.yml` の `sleep 1` を 30 秒〜数分に延ばす、または 1 ワークフロー完了を待ってから次を dispatch するなど。
3. **ラッパー側でスロットルを入れる**  
   - `get_response` の成功時や、`download_document` の前後に短い `time.sleep` を入れる。  
   - または 1 クライアントあたりの同時リクエスト数を制限する（セマフォ等）。
4. **並列スレッド数を減らす**  
   - `prepare_edinet_corpus.py` の `max_workers` のデフォルトを 8 から 2〜4 に下げる（GHA 用に環境変数で上書きする運用も可）。
5. **一覧取得のリクエスト間隔を空ける**  
   - `get_results` の日付ループ内で、各 `get_response` の後に 0.5〜1 秒程度 `time.sleep` を入れる。

上記は「原因のまとめ」に続く対策案です。実際の変更時は EDINET の利用規約・ガイドラインも確認してください。
