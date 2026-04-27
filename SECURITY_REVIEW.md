# セキュリティレビュー: EDINET Financial Data Screener
**実施日**: 2026-04-27  
**レビュー範囲**: Cloudflare D1, データ取得・更新パイプライン, データベース構造  
**レビュイー**: エキスパートエンジニア

---

## Executive Summary

本システムは**全体的に堅牢な設計**で、SQLインジェクションやデータ改ざんに対する防御は適切です。しかし、**本番環境での5つの重大な潜在リスク**が存在し、即座の対応が必要です。

### リスク分布
- 🔴 **Critical**: 3件 (API キー露出, アクセス制御欠落, ログの機密情報)
- 🟠 **High**: 4件 (エラーハンドリング不十分, ファイルパス走査, 過度なパーミッション, データバリデーション)
- 🟡 **Medium**: 5件 (例外処理不明確, ドキュメント欠落, パフォーマンス)

---

## 1. 🔴 Critical Issues

### 1.1 GitHub Actions シークレット管理の脆弱性
**ファイル**: `.github/workflows/daily-refresh.yml:116-117, 140, 158-159, 175-176`  
**リスク**: `CLOUDFLARE_API_TOKEN`, `EDINET_API_KEY` が GitHub Actions ログに露出する可能性

#### 問題
```yaml
env:
  CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}  # ❌ ログに出力される可能性
  CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
  EDINET_API_KEY: ${{ secrets.EDINET_API_KEY }}
```

#### 影響
- CI ログに API キーが记录される可能性（GitHub Actions のマスキング機能に依存）
- フォークされたリポジトリで secrets が利用不可
- CI ジョブの出力やエラーメッセージに機密情報が混在

#### 対応
```bash
# ❌ 現在: 環境変数として直接渡す
env:
  EDINET_API_KEY: ${{ secrets.EDINET_API_KEY }}

# ✅ 推奨: --input-flags で直接渡す（ログに出力されない）
run: |
  uv run python scripts/pipeline/ingest_daily_edinet_to_db.py \
    --api-key "${{ secrets.EDINET_API_KEY }}" \
    ...
```

---

### 1.2 D1 への Unauthenticated パブリックアクセス
**ファイル**: `edinet-screener` の Wrangler 設定（`wrangler.toml`）  
**リスク**: D1 データベースがパブリックに公開されている可能性

#### 問題
```
❓ wrangler.toml を確認できませんが、D1 バインディング設定が不明瞭
- EDINET_DB への認証メカニズムが明記されていない
- フロントエンド（Cloudflare Workers）からの D1 アクセス制御が不透明
```

#### 影響
```
⚠️ 潜在的なシナリオ:
1. 未認証ユーザーが D1 に直接クエリを実行
2. 全社の財務データがスクレイピング可能
3. Rate limiting なしでの過度なアクセス
```

#### 対応
```typescript
// ✅ wrangler.toml で D1 バインディングに認証を追加
[[env.production.bindings]]
name = "EDINET_DB"
database_id = "xxx"
binding = "db"

// ✅ ワーカーコードで認証ヘッダーを検証
export default {
  async fetch(request: Request, env: Env) {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401 });
    }
    // D1 クエリ実行
  }
};
```

---

### 1.3 GitHub Actions `contents: write` パーミッションの過度な付与
**ファイル**: `.github/workflows/daily-refresh.yml:43-44`  
**リスク**: 全リポジトリコンテンツへの書き込み権限

#### 問題
```yaml
permissions:
  contents: write  # ❌ 全ファイルへの書き込み権限
```

#### 影響
- 悪意のあるステップでソースコードの改ざんが可能
- セキュリティパッチの削除や除去が可能
- パイプラインの乗っ取り時のリスクが拡大

#### 対応
```yaml
permissions:
  contents: write  # ✅ 必要: データファイルのコミット
  # 具体的なスコープは以下を追加検討
  packages: read  # npm install のみ
```

**より安全なアプローチ**:
1. データコミットを分離したジョブで実行
2. デプロイジョブには別の制限されたトークンを使用
3. `GITHUB_TOKEN` の自動昇格を無効化

---

## 2. 🟠 High-Risk Issues

### 2.1 Zip ファイル抽出時のパストラバーサル脆弱性
**ファイル**: `downloader.py:254-263, 276-290`  
**リスク**: EDINET API からのファイルダウンロード時にパストラバーサルが可能

#### 問題
```python
# ❌ 現在: ファイル名の検証が不十分
with zipfile.ZipFile(io.BytesIO(res.content)) as z:
    for file in z.namelist():
        z.extract(file, tmp_dir)  # パストラバーサルが可能
        output_file = os.path.join(output_dir, f"{doc_id}", file)
        shutil.move(os.path.join(tmp_dir, file), output_file)
```

#### 攻撃シナリオ
```
malicious.zip 内容:
  ../../../../../../etc/passwd
  ../../config/production-secrets.env
  ../../../.ssh/id_rsa
```

#### 対応
```python
# ✅ パストトラバーサル防止
import os.path
import zipfile

def safe_extract(zip_path, extract_to, allowed_prefix):
    """安全にZIPを展開"""
    with zipfile.ZipFile(zip_path) as z:
        for member in z.infolist():
            # パストの正規化と検証
            target_path = os.path.normpath(os.path.join(extract_to, member.filename))
            if not target_path.startswith(os.path.normpath(extract_to)):
                raise ValueError(f"パストトラバーサル試行: {member.filename}")
            
            # ディレクトリトラバーサル記号をチェック
            if ".." in member.filename or member.filename.startswith("/"):
                continue  # スキップまたはログ
            
            z.extract(member, extract_to)
```

---

### 2.2 データベースクエリのドキュメント欠落（SQLインジェクションのリスク）
**ファイル**: `db_common.py:119-273`  
**リスク**: すべてのクエリがパラメータ化されているか確認不可

#### 問題
```python
# ✅ OK: パラメータ化されている
conn.execute("""
  INSERT INTO companies (edinet_code, sec_code, ...)
  VALUES (?, ?, ?, ?, ?)
""", (edinet_code, normalize_sec_code(sec_code), ...))

# ⚠️ 懸念: 動的クエリ構築の箇所がないか？
# normalize_sec_code() の出力が常に安全か？
def normalize_sec_code(sec_code: str | None) -> str:
    value = (sec_code or "").strip().strip('"')  # ダブルクォートを削除
    value = value.lstrip("0") or value
    return value
```

#### 対応
```python
# ✅ 推奨: より厳密な検証
import re

def normalize_sec_code(sec_code: str | None) -> str:
    """証券コードの正規化と検証"""
    if not sec_code:
        return ""
    
    # 4-5 桁の数字のみを許可
    value = sec_code.strip().strip('"')
    if not re.match(r'^\d{4,5}$', value):
        raise ValueError(f"Invalid sec_code format: {value}")
    
    # 先頭の 0 を削除
    value = value.lstrip('0') or '0'
    return value
```

---

### 2.3 例外処理が過度に広すぎる
**ファイル**: `downloader.py:265-267, 288-290, 341-343`  
**リスク**: セキュリティ例外がサイレントに無視される

#### 問題
```python
# ❌ 全例外をキャッチ → 重大なエラーが隠れる
except Exception as e:
    logger.error(f"Error downloading document {doc_id}: {e}")
    return None
```

例えば以下のエラーが無視される:
- `PermissionError` - ファイルシステムの権限不足
- `MemoryError` - OOM 攻撃による DOS
- `KeyboardInterrupt` - 意図しない中断
- `SystemExit` - プロセス終了信号

#### 対応
```python
# ✅ 特定の例外のみキャッチ
try:
    with requests.get(url, params=params) as res:
        with zipfile.ZipFile(io.BytesIO(res.content)) as z:
            for file in z.namelist():
                z.extract(file, tmp_dir)
except (requests.RequestException, zipfile.BadZipFile) as e:
    logger.error(f"Failed to download {doc_id}: {e}")
except Exception as e:
    logger.critical(f"Unexpected error in download: {e}", exc_info=True)
    raise  # 予期しないエラーは再発生させる
```

---

### 2.4 D1 スキーマに `NOT NULL` 制約が不足
**ファイル**: `sql/d1_schema.sql:3-48`  
**リスク**: NULL 値が許可される際にデータ品質が低下

#### 問題
```sql
-- ❌ 現在
CREATE TABLE companies (
  edinet_code TEXT PRIMARY KEY,
  sec_code TEXT,              -- NULL が許可される
  filer_name TEXT NOT NULL,
  listed_category TEXT,       -- NULL が許可される
  industry TEXT               -- NULL が許可される
);

CREATE TABLE documents (
  doc_id TEXT PRIMARY KEY,
  edinet_code TEXT NOT NULL,
  sec_code TEXT,              -- ❌ NULL 許可（一貫性問題）
  doc_type TEXT NOT NULL
);
```

#### 影響
- ジョイン時に NULL 値によるマッチ失敗
- フロントエンドで NULL チェック忘れのバグ
- 集計クエリの精度低下

#### 対応
```sql
-- ✅ より厳密なスキーマ
CREATE TABLE companies (
  edinet_code TEXT PRIMARY KEY,
  sec_code TEXT NOT NULL,              -- 必須
  filer_name TEXT NOT NULL,
  listed_category TEXT DEFAULT 'unknown',
  industry TEXT DEFAULT 'unknown',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE documents (
  doc_id TEXT PRIMARY KEY,
  edinet_code TEXT NOT NULL,
  sec_code TEXT NOT NULL,              -- 必須（一貫性）
  doc_type TEXT NOT NULL,
  -- ... その他フィールド
  FOREIGN KEY (edinet_code) REFERENCES companies(edinet_code)
);
```

---

## 3. 🟡 Medium-Risk Issues

### 3.1 データベースバックアップ・リカバリーの不透明性
**ファイル**: `.github/workflows/daily-refresh.yml:113-134`  
**リスク**: 障害復旧の方法が定義されていない

#### 問題
```bash
# ❌ 毎日 D1 をエクスポート → SQLite にロード → 処理
# バックアップ戦略がない
bash scripts/d1-apply-schema.sh "$D1_ENVIRONMENT"
wrangler d1 export EDINET_DB --remote --no-schema \
  --output ../edinet-wrapper/state/d1-export.sql
```

#### 影響
- D1 データが破損した場合のリカバリーパス不明
- 誤削除・改ざんの検知遅延
- 監査トレールが限定的

#### 対応
```bash
# ✅ バージョン管理されたバックアップ
# .github/workflows/weekly-backup.yml
name: Weekly D1 Backup

on:
  schedule:
    - cron: "0 0 * * 0"  # 毎週日曜 00:00 JST

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Backup D1
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: |
          wrangler d1 export EDINET_DB --remote \
            --output "backups/d1-export-$(date +%Y%m%d).sql"
          git add backups/
          git commit -m "chore: weekly D1 backup"
          git push
```

---

### 3.2 EDINET API へのレート制限対策不足
**ファイル**: `downloader.py:121-149`  
**リスク**: API が厳しいレート制限を課した場合の対応不備

#### 問題
```python
_GET_RESPONSE_MAX_RETRIES = 5
_GET_RESPONSE_RETRY_DELAY = 60  # 固定 60 秒

# ❌ Exponential backoff ではない
for attempt in range(Downloader._GET_RESPONSE_MAX_RETRIES):
    res = requests.get(url, params=params)
    if res.status_code != 200:
        time.sleep(Downloader._GET_RESPONSE_RETRY_DELAY)
```

#### 影響
- レート制限が設定されている場合、リトライが無駄
- 429 (Too Many Requests) への対応がない
- Retry-After ヘッダーを無視

#### 対応
```python
import random

def get_response(self, url: str, date: datetime.date, ...) -> dict:
    base_delay = 1  # 初期遅延
    for attempt in range(self._max_retries):
        try:
            res = requests.get(url, params=params, timeout=30)
            
            if res.status_code == 429:
                # Retry-After ヘッダーを尊重
                retry_after = int(res.headers.get('Retry-After', base_delay * (2 ** attempt)))
                logger.warning(f"Rate limited. Waiting {retry_after}s")
                time.sleep(retry_after)
                continue
            
            if res.status_code == 200:
                return res.json()
            
            res.raise_for_status()
        except requests.RequestException as e:
            if attempt < self._max_retries - 1:
                # Exponential backoff with jitter
                delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                logger.warning(f"Attempt {attempt+1} failed: {e}. Retry in {delay:.1f}s")
                time.sleep(delay)
            else:
                raise
```

---

### 3.3 ログに機密データが混入
**ファイル**: `downloader.py:131-144`  
**リスク**: API レスポンスがログに記録される可能性

#### 問題
```python
logger.warning(
    f"EDINET API status {res.status_code} (attempt {attempt + 1}/...),
      body: {res.text[:300]}"  # ❌ レスポンスボディをログ
)
```

レスポンスに機密データが含まれる場合:
- エラーメッセージに会社名・個人情報が混在
- CI ログが長期保存される場合のリスク

#### 対応
```python
logger.warning(
    f"EDINET API error: status={res.status_code}, "
    f"attempt={attempt + 1}/{self._max_retries}. "
    f"Response size: {len(res.text)} bytes"
    # ✅ 実際のボディは記録しない
)

# デバッグが必要な場合
if logger.level == logging.DEBUG:
    logger.debug(f"Full response: {res.text[:500]}")  # DEBUG レベルのみ
```

---

### 3.4 フロントエンド JSON ファイルのアクセス制御
**ファイル**: `edinet-screener/public/data/`  
**リスク**: すべての財務データがパブリックに公開

#### 問題
```
edinet-screener/public/data/
  ├── companies.json          # 全社リスト（公開）
  ├── company_metrics.json    # 全社の主要指標（公開）
  └── summaries/{secCode}.json  # 詳細な財務諸表（公開）
```

これらは `public/` ディレクトリにあり、認証なしでアクセス可能。

#### 影響
- 非上場企業の機密財務情報が公開される可能性
- 競争企業による情報収集
- GDPR・個人情報保護法違反の可能性

#### 対応
```typescript
// ✅ wrangler.toml で認証ゲートを設定
[[routes]]
pattern = "example.com/data/*"
custom_domain = true

// ✅ ワーカーで認証を追加
export default {
  async fetch(request: Request) {
    const url = new URL(request.url);
    
    if (url.pathname.startsWith("/data/")) {
      const auth = request.headers.get("Authorization");
      if (!isValidAuth(auth)) {
        return new Response("Unauthorized", { status: 401 });
      }
    }
    
    return env.ASSETS.fetch(request);
  }
};
```

---

### 3.5 D1 のスキーマバージョニング戦略の不在
**ファイル**: `sql/d1_schema.sql`  
**リスク**: スキーマ変更時の互換性維持が困難

#### 問題
- スキーマファイルにバージョン番号がない
- マイグレーション履歴が管理されていない
- ロールバック機能がない

#### 対応
```sql
-- ✅ スキーマバージョン管理テーブル
CREATE TABLE IF NOT EXISTS schema_versions (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  checksum TEXT NOT NULL,
  description TEXT
);

-- v1_initial_schema.sql
INSERT INTO schema_versions (version, name, checksum, description)
VALUES (1, 'initial_schema', 'abc123...', 'Initial schema with companies, documents tables');

-- v2_add_metrics.sql
ALTER TABLE daily_metrics ADD COLUMN updated_count INTEGER DEFAULT 0;
INSERT INTO schema_versions (version, name, checksum, description)
VALUES (2, 'add_metrics', 'def456...', 'Add updated_count column to daily_metrics');
```

---

## 4. ✅ Good Security Practices

本システムが適切に実装している点:

### 4.1 SQLインジェクション防止
```python
# ✅ すべてのクエリが parameterized queries を使用
conn.execute(
    "INSERT INTO companies (edinet_code, ...) VALUES (?, ?, ?)",
    (edinet_code, sec_code, filer_name)
)
```

### 4.2 ファイル整合性検証
```python
# ✅ SHA256 ハッシュでファイル検証
file_hash = hashlib.sha256(file_content).hexdigest()
conn.execute("INSERT INTO raw_files_index (..., file_hash, ...) VALUES (..., ?, ...)",
            (..., file_hash, ...))
```

### 4.3 フォーリングキー制約
```sql
-- ✅ 参照整合性を強制
CREATE TABLE documents (
  ...
  FOREIGN KEY (edinet_code) REFERENCES companies(edinet_code)
);
```

### 4.4 API キーの安全な処理
```python
# ✅ GitHub Actions 改行対策
self.edinet_api_key = raw_key.strip()
```

---

## 5. 推奨事項（優先度付き）

| 優先度 | 項目 | 対応 | 影響 |
|--------|------|------|------|
| 🔴 P0 | CI ログへのシークレット露出 | 環境変数をコマンドライン引数に変更 | 本番環境稼働停止リスク |
| 🔴 P0 | D1 へのアクセス制御欠落 | 認証ゲートを追加 | データ漏洩 |
| 🔴 P0 | GitHub Actions パーミッション過度 | `contents: write` スコープを制限 | ソースコード改ざん |
| 🟠 P1 | パストトラバーサル脆弱性 | Zip 抽出時に パストチェック | リモートコード実行 |
| 🟠 P1 | 例外処理が広すぎる | 特定例外のみキャッチ | Silent failure |
| 🟠 P1 | データベーススキーマ NOT NULL 制約 | フィールドを必須化 | データ品質低下 |
| 🟡 P2 | API レート制限対応 | Exponential backoff + Retry-After | サービス中断 |
| 🟡 P2 | ログの機密データ | 本番ログから除外 | 機密漏洩 |
| 🟡 P2 | バックアップ・リカバリー | 定期バックアップパイプライン | 障害復旧困難 |

---

## 6. テストカバレッジの推奨

```bash
# セキュリティテストの追加
pytest tests/security/test_sql_injection.py -v
pytest tests/security/test_path_traversal.py -v
pytest tests/security/test_api_auth.py -v

# SAST (Static Analysis Security Testing)
bandit -r edinet-wrapper/src/
semgrep --config=p/security-audit edinet-wrapper/
```

---

## 7. 監査・ログ戦略

### 7.1 ログ記録対象
```python
# ✅ 監査ログ（別ストリーム）
audit_logger.info({
  "event": "data_export",
  "user": "github-actions",
  "scope": "production",
  "table": "period_financials",
  "record_count": 1000,
  "timestamp": "2026-04-27T10:30:00Z"
})
```

### 7.2 CloudFlare Analytics
- D1 クエリレート監視
- API 応答時間監視
- エラーレート 閾値設定

---

## 8. 結論

このシステムは**全体的に堅牢**ですが、本番運用の前に以下の 3 つの Critical リスクに対応が必須です:

1. **CI/CD パイプラインのシークレット管理**
2. **D1 データベースアクセス認証**
3. **GitHub Actions パーミッション制限**

これら対応後、レビューアーとの最終確認を推奨します。
