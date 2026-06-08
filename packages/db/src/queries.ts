import { and, asc, desc, eq, gte, lte, or, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import {
  companies,
  companyMetrics,
  documents,
  periodFinancials,
  secCodeLatestPeriods,
  shareholderSnapshots,
} from "./schema.js";
import type * as schema from "./schema.js";

export type DB = DrizzleD1Database<typeof schema>;

export async function listCompanies(
  db: DB,
  opts: { limit?: number; offset?: number; industry?: string } = {},
) {
  const { limit = 100, offset = 0, industry } = opts;
  const where = industry ? eq(companies.industry, industry) : undefined;
  return db.select().from(companies).where(where).limit(limit).offset(offset).all();
}

export async function getCompanyBySecCode(db: DB, secCode: string) {
  return db.select().from(companies).where(eq(companies.secCode, secCode)).get();
}

export async function getCompanyByEdinetCode(db: DB, edinetCode: string) {
  return db.select().from(companies).where(eq(companies.edinetCode, edinetCode)).get();
}

export async function getSummaryBySecCode(db: DB, secCode: string) {
  return db
    .select({
      edinetCode: periodFinancials.edinetCode,
      secCode: periodFinancials.secCode,
      docId: periodFinancials.docId,
      docType: periodFinancials.docType,
      docDescription: documents.docDescription,
      periodStart: periodFinancials.periodStart,
      periodEnd: periodFinancials.periodEnd,
      submitDateTime: periodFinancials.submitDateTime,
      filerName: periodFinancials.filerName,
      summaryJson: periodFinancials.summaryJson,
      plJson: periodFinancials.plJson,
      bsJson: periodFinancials.bsJson,
      cfJson: periodFinancials.cfJson,
      rawTsvPath: periodFinancials.rawTsvPath,
      updatedAt: periodFinancials.updatedAt,
    })
    .from(periodFinancials)
    .innerJoin(documents, eq(periodFinancials.docId, documents.docId))
    .where(eq(periodFinancials.secCode, secCode))
    .orderBy(desc(periodFinancials.periodEnd))
    .all();
}

export async function getCompanyMetrics(db: DB, opts: { limit?: number; offset?: number } = {}) {
  const { limit = 500, offset = 0 } = opts;
  return db
    .select()
    .from(companyMetrics)
    .orderBy(companyMetrics.filerName)
    .limit(limit)
    .offset(offset)
    .all();
}

export async function getAllCompanyMetrics(db: DB) {
  return db.select().from(companyMetrics).orderBy(companyMetrics.filerName).all();
}

export async function countCompanyMetrics(db: DB) {
  const [row] = await db.select({ c: sql<number>`count(*)` }).from(companyMetrics).all();
  return row?.c ?? 0;
}

const METRICS_SORT_COLUMNS = {
  roe: companyMetrics.roe,
  sales: companyMetrics.sales,
  total_assets: companyMetrics.totalAssets,
  filer_name: companyMetrics.filerName,
  calc_date: companyMetrics.calcDate,
  equity_ratio: companyMetrics.equityRatio,
} as const;

export type CompanyMetricsSortField = keyof typeof METRICS_SORT_COLUMNS;

export type CompanyMetricsQueryFilters = {
  q?: string;
  minRoe?: number;
  maxRoe?: number;
  minSales?: number;
  maxSales?: number;
  minEquityRatio?: number;
  maxEquityRatio?: number;
  minTotalAssets?: number;
  maxTotalAssets?: number;
};

function likePattern(q: string): string {
  const escaped = q.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  return `%${escaped}%`;
}

export async function queryCompanyMetrics(
  db: DB,
  filters: CompanyMetricsQueryFilters,
  sort: { field: CompanyMetricsSortField; order: "asc" | "desc" },
  pagination: { page: number; pageSize: number },
) {
  const conditions = [];

  const q = filters.q?.trim();
  if (q) {
    const pattern = likePattern(q);
    conditions.push(
      or(
        sql`${companyMetrics.filerName} LIKE ${pattern} ESCAPE '\\'`,
        sql`${companyMetrics.secCode} LIKE ${pattern} ESCAPE '\\'`,
      ),
    );
  }

  if (filters.minRoe != null) conditions.push(gte(companyMetrics.roe, filters.minRoe));
  if (filters.maxRoe != null) conditions.push(lte(companyMetrics.roe, filters.maxRoe));
  if (filters.minSales != null) conditions.push(gte(companyMetrics.sales, filters.minSales));
  if (filters.maxSales != null) conditions.push(lte(companyMetrics.sales, filters.maxSales));
  if (filters.minEquityRatio != null) conditions.push(gte(companyMetrics.equityRatio, filters.minEquityRatio));
  if (filters.maxEquityRatio != null) conditions.push(lte(companyMetrics.equityRatio, filters.maxEquityRatio));
  if (filters.minTotalAssets != null) conditions.push(gte(companyMetrics.totalAssets, filters.minTotalAssets));
  if (filters.maxTotalAssets != null) conditions.push(lte(companyMetrics.totalAssets, filters.maxTotalAssets));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countRow] = await db.select({ c: sql<number>`count(*)` }).from(companyMetrics).where(where).all();
  const total = countRow?.c ?? 0;

  const sortCol = METRICS_SORT_COLUMNS[sort.field];
  const orderBy = sort.order === "desc" ? desc(sortCol) : asc(sortCol);

  const page = Math.max(1, pagination.page);
  const pageSize = Math.min(Math.max(1, pagination.pageSize), 500);
  const offset = (page - 1) * pageSize;

  const rows = await db
    .select()
    .from(companyMetrics)
    .where(where)
    .orderBy(orderBy)
    .limit(pageSize)
    .offset(offset)
    .all();

  return { rows, total, page, pageSize };
}

export async function countCompanies(db: DB, opts: { industry?: string } = {}) {
  const { industry } = opts;
  const where = industry ? eq(companies.industry, industry) : undefined;
  const [row] = await db.select({ c: sql<number>`count(*)` }).from(companies).where(where).all();
  return row?.c ?? 0;
}

export async function getShareholdersBySecCode(db: DB, secCode: string) {
  return db
    .select()
    .from(shareholderSnapshots)
    .where(eq(shareholderSnapshots.secCode, secCode))
    .orderBy(desc(shareholderSnapshots.periodEnd))
    .all();
}

export async function searchCompanies(db: DB, q: string, limit = 20) {
  // Escape LIKE wildcards so a user-supplied "%" / "_" can't match-all or
  // build pathological patterns. ESCAPE '\' makes the backslash literal.
  const escaped = q.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const pattern = `%${escaped}%`;
  return db
    .select()
    .from(companies)
    .where(
      or(
        sql`${companies.filerName} LIKE ${pattern} ESCAPE '\\'`,
        sql`${companies.secCode} LIKE ${pattern} ESCAPE '\\'`,
      ),
    )
    .limit(limit)
    .all();
}

export async function getDocumentIds(db: DB) {
  return db.select({ docId: documents.docId }).from(documents).all();
}

export async function countAll(db: DB) {
  const [companyCount] = await db.select({ c: sql<number>`count(*)` }).from(companies).all();
  const [docCount] = await db.select({ c: sql<number>`count(*)` }).from(documents).all();
  return {
    companies: companyCount?.c ?? 0,
    documents: docCount?.c ?? 0,
  };
}
