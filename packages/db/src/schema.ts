import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

export const companies = sqliteTable("companies", {
  edinetCode: text("edinet_code").primaryKey(),
  secCode: text("sec_code"),
  filerName: text("filer_name").notNull(),
  listedCategory: text("listed_category"),
  industry: text("industry"),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const documents = sqliteTable(
  "documents",
  {
    docId: text("doc_id").primaryKey(),
    edinetCode: text("edinet_code")
      .notNull()
      .references(() => companies.edinetCode),
    secCode: text("sec_code"),
    docType: text("doc_type").notNull(),
    ordinanceCode: text("ordinance_code"),
    formCode: text("form_code"),
    docTypeCode: text("doc_type_code"),
    periodStart: text("period_start"),
    periodEnd: text("period_end"),
    submitDateTime: text("submit_date_time"),
    withdrawalStatus: text("withdrawal_status"),
    docDescription: text("doc_description"),
    sourceMetaJson: text("source_meta_json").notNull(),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => ({
    submitDateIdx: index("idx_documents_submit_date").on(t.submitDateTime),
    docTypeIdx: index("idx_documents_doc_type").on(t.docType, t.submitDateTime),
  }),
);

export const periodFinancials = sqliteTable(
  "period_financials",
  {
    edinetCode: text("edinet_code")
      .notNull()
      .references(() => companies.edinetCode),
    secCode: text("sec_code"),
    docId: text("doc_id")
      .notNull()
      .references(() => documents.docId),
    docType: text("doc_type").notNull(),
    periodStart: text("period_start"),
    periodEnd: text("period_end").notNull(),
    submitDateTime: text("submit_date_time"),
    filerName: text("filer_name").notNull(),
    summaryJson: text("summary_json").notNull(),
    plJson: text("pl_json").notNull(),
    bsJson: text("bs_json").notNull(),
    cfJson: text("cf_json").notNull(),
    rawTsvPath: text("raw_tsv_path"),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.edinetCode, t.periodEnd, t.docType] }),
    secPeriodIdx: index("idx_period_financials_sec_period").on(t.secCode, t.periodEnd),
    submitDateIdx: index("idx_period_financials_submit_date").on(t.submitDateTime),
  }),
);

export const rawFilesIndex = sqliteTable(
  "raw_files_index",
  {
    fileId: text("file_id").primaryKey(),
    docId: text("doc_id")
      .notNull()
      .references(() => documents.docId),
    edinetCode: text("edinet_code")
      .notNull()
      .references(() => companies.edinetCode),
    docType: text("doc_type").notNull(),
    fileType: text("file_type").notNull(),
    objectKey: text("object_key").notNull(),
    fileHash: text("file_hash"),
    fileSizeBytes: integer("file_size_bytes"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => ({
    uniqDocFile: unique("uq_raw_files_doc_file").on(t.docId, t.fileType),
    docFileTypeIdx: index("idx_raw_files_doc_file_type").on(t.docId, t.fileType),
  }),
);

export const pipelineRuns = sqliteTable("pipeline_runs", {
  runId: text("run_id").primaryKey(),
  scope: text("scope").notNull(),
  targetDate: text("target_date").notNull(),
  status: text("status").notNull(),
  startedAt: text("started_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  finishedAt: text("finished_at"),
  fetchedDocuments: integer("fetched_documents").notNull().default(0),
  ingestedDocuments: integer("ingested_documents").notNull().default(0),
  skippedDocuments: integer("skipped_documents").notNull().default(0),
  errorCount: integer("error_count").notNull().default(0),
  notes: text("notes"),
});

export const dailyMetrics = sqliteTable("daily_metrics", {
  snapshotDate: text("snapshot_date").primaryKey(),
  companyCount: integer("company_count").notNull(),
  documentCount: integer("document_count").notNull(),
  periodFinancialCount: integer("period_financial_count").notNull(),
  generatedAt: text("generated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const secCodeLatestPeriods = sqliteTable(
  "sec_code_latest_periods",
  {
    secCode: text("sec_code").primaryKey(),
    edinetCode: text("edinet_code")
      .notNull()
      .references(() => companies.edinetCode),
    filerName: text("filer_name").notNull(),
    latestDocId: text("latest_doc_id")
      .notNull()
      .references(() => documents.docId),
    latestPeriodEnd: text("latest_period_end").notNull(),
    latestSubmitDateTime: text("latest_submit_date_time"),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => ({
    periodEndIdx: index("idx_sec_code_latest_periods_period_end").on(t.latestPeriodEnd),
  }),
);

export type Company = typeof companies.$inferSelect;
export type CompanyInsert = typeof companies.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type PeriodFinancial = typeof periodFinancials.$inferSelect;
export type DailyMetric = typeof dailyMetrics.$inferSelect;
export type SecCodeLatestPeriod = typeof secCodeLatestPeriods.$inferSelect;
