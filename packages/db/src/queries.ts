import { desc, eq, or, sql } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { companies, documents, periodFinancials, secCodeLatestPeriods } from "./schema.js";
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
    .select()
    .from(periodFinancials)
    .where(eq(periodFinancials.secCode, secCode))
    .orderBy(desc(periodFinancials.periodEnd))
    .all();
}

export async function getLatestMetrics(db: DB, opts: { limit?: number; offset?: number } = {}) {
  const { limit = 200, offset = 0 } = opts;
  return db
    .select({
      secCode: secCodeLatestPeriods.secCode,
      edinetCode: secCodeLatestPeriods.edinetCode,
      filerName: secCodeLatestPeriods.filerName,
      latestPeriodEnd: secCodeLatestPeriods.latestPeriodEnd,
      latestSubmitDateTime: secCodeLatestPeriods.latestSubmitDateTime,
      industry: companies.industry,
      listedCategory: companies.listedCategory,
    })
    .from(secCodeLatestPeriods)
    .leftJoin(companies, eq(secCodeLatestPeriods.edinetCode, companies.edinetCode))
    .orderBy(desc(secCodeLatestPeriods.latestPeriodEnd))
    .limit(limit)
    .offset(offset)
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
