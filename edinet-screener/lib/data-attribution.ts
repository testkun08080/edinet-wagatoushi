/**
 * EDINET 等の出典表示用（利用条件・ライセンスに従って表示を更新してください）。
 * 本番の取得パイプラインで実際に呼び出したエンドポイントが分かる場合はここを置き換えてください。
 */

export const EDINET_API_BASE = "https://disclosure.edinet-fsa.go.jp/api/v1";

/** データ生成パイプライン（edinet-wrapper 等）で一般的に用いられる EDINET Web API の例 */
export const DOCUMENTED_EDINET_ENDPOINTS = [
  {
    method: "GET" as const,
    path: "/documents.json",
    description: "提出書類一覧の取得（日付などのクエリパラメータで対象日を指定する形式が一般的です）",
    fullUrlExample: `${EDINET_API_BASE}/documents.json`,
  },
  {
    method: "GET" as const,
    path: "/documents/{docID}",
    description: "提出書類本体の取得（type 等のクエリで提出種別に応じた取得）",
    fullUrlExample: `${EDINET_API_BASE}/documents/{docID}`,
  },
] as const;

/** ブラウザ上の本アプリが読み込む静的データ（ビルド済み JSON） */
export const RUNTIME_STATIC_DATA_PATHS = [
  { path: "/data/company_metrics.json", description: "企業一覧用の指標サマリー" },
  { path: "/data/summaries/{証券コード}.json", description: "企業ごとの四半期サマリー・財務テーブル" },
  { path: "/data/raw_tsv/{証券コード}/{docID}.json", description: "大株主など抽出用の生 TSV 相当データ" },
] as const;

export const LICENSE_AND_GUIDELINES = {
  pdm: {
    label: "パブリック・データ（PDM）ライセンス（デジタル庁）",
    url: "https://www.digital.go.jp/resources/open_data/public_data_license_v1.0",
  },
  disclosure2Guide: {
    label: "EDINET 書類のダウンロードに関する説明（金融庁・PDF）",
    url: "https://disclosure2dl.edinet-fsa.go.jp/guide/static/disclosure/download/ESE140206.pdf",
  },
  edinetPortal: {
    label: "EDINET（金融庁）",
    url: "https://disclosure.edinet-fsa.go.jp/",
  },
} as const;
