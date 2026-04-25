PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS companies (
  edinet_code TEXT PRIMARY KEY,
  sec_code TEXT,
  filer_name TEXT NOT NULL,
  listed_category TEXT,
  industry TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
  doc_id TEXT PRIMARY KEY,
  edinet_code TEXT NOT NULL,
  sec_code TEXT,
  doc_type TEXT NOT NULL,
  ordinance_code TEXT,
  form_code TEXT,
  doc_type_code TEXT,
  period_start TEXT,
  period_end TEXT,
  submit_date_time TEXT,
  withdrawal_status TEXT,
  doc_description TEXT,
  source_meta_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (edinet_code) REFERENCES companies(edinet_code)
);

CREATE TABLE IF NOT EXISTS period_financials (
  edinet_code TEXT NOT NULL,
  sec_code TEXT,
  doc_id TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  period_start TEXT,
  period_end TEXT,
  submit_date_time TEXT,
  filer_name TEXT NOT NULL,
  summary_json TEXT NOT NULL,
  pl_json TEXT NOT NULL,
  bs_json TEXT NOT NULL,
  cf_json TEXT NOT NULL,
  raw_tsv_path TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (edinet_code, period_end, doc_type),
  FOREIGN KEY (doc_id) REFERENCES documents(doc_id),
  FOREIGN KEY (edinet_code) REFERENCES companies(edinet_code)
);

CREATE TABLE IF NOT EXISTS raw_files_index (
  file_id TEXT PRIMARY KEY,
  doc_id TEXT NOT NULL,
  edinet_code TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  file_type TEXT NOT NULL,
  object_key TEXT NOT NULL,
  file_hash TEXT,
  file_size_bytes INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (doc_id, file_type),
  FOREIGN KEY (doc_id) REFERENCES documents(doc_id),
  FOREIGN KEY (edinet_code) REFERENCES companies(edinet_code)
);

CREATE TABLE IF NOT EXISTS pipeline_runs (
  run_id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  target_date TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  fetched_documents INTEGER NOT NULL DEFAULT 0,
  ingested_documents INTEGER NOT NULL DEFAULT 0,
  skipped_documents INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS daily_metrics (
  snapshot_date TEXT PRIMARY KEY,
  company_count INTEGER NOT NULL,
  document_count INTEGER NOT NULL,
  period_financial_count INTEGER NOT NULL,
  generated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 事前集計: 証券コードごとの最新提出を高速参照するためのマテリアライズテーブル
CREATE TABLE IF NOT EXISTS sec_code_latest_periods (
  sec_code TEXT PRIMARY KEY,
  edinet_code TEXT NOT NULL,
  filer_name TEXT NOT NULL,
  latest_doc_id TEXT NOT NULL,
  latest_period_end TEXT NOT NULL,
  latest_submit_date_time TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_submit_date
  ON documents(submit_date_time);

CREATE INDEX IF NOT EXISTS idx_documents_doc_type
  ON documents(doc_type, submit_date_time);

CREATE INDEX IF NOT EXISTS idx_period_financials_sec_period
  ON period_financials(sec_code, period_end);

CREATE INDEX IF NOT EXISTS idx_period_financials_submit_date
  ON period_financials(submit_date_time);

CREATE INDEX IF NOT EXISTS idx_raw_files_doc_file_type
  ON raw_files_index(doc_id, file_type);

CREATE INDEX IF NOT EXISTS idx_sec_code_latest_periods_period_end
  ON sec_code_latest_periods(latest_period_end);
