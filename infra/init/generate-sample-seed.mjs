#!/usr/bin/env node
/**
 * Regenerate infra/init/seed-local-d1.sql and apps/web/public/data/shareholders/9999.json
 * Run: node infra/init/generate-sample-seed.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

const ANNUAL_FY = [2021, 2022, 2023, 2024, 2025];
const mult = [0.75, 0.82, 0.88, 0.94, 1.0];

const base = {
  sales: 1_000_000_000_000,
  op: 120_000_000_000,
  ord: 115_000_000_000,
  net: 80_000_000_000,
  comp: 82_000_000_000,
  ta: 2_500_000_000_000,
  eq: 1_200_000_000_000,
  liab: 1_300_000_000_000,
  ca: 900_000_000_000,
  cl: 500_000_000_000,
  ocf: 150_000_000_000,
  icf: -60_000_000_000,
  fcf: -40_000_000_000,
  divPaid: -25_000_000_000,
  cash: 200_000_000_000,
  invSec: 45_000_000_000,
  cogs: 700_000_000_000,
  gross: 300_000_000_000,
  sga: 180_000_000_000,
  shares: 430_000_000,
  eps: 185.5,
  bps: 2180,
  dps: 50,
  employees: 12500,
  temp: 3200,
};

function yen(n) {
  return String(Math.round(n));
}

function escSql(s) {
  return s.replace(/'/g, "''");
}

function j(obj) {
  return escSql(JSON.stringify(obj));
}

function buildBlocks(scale, { perShareScale = 1, headcountScale = 1 } = {}) {
  const sales = base.sales * scale;
  const op = base.op * scale;
  const ord = base.ord * scale;
  const net = base.net * scale;
  const comp = base.comp * scale;
  const ta = base.ta * scale;
  const eq = base.eq * scale;
  const liab = base.liab * scale;
  const ca = base.ca * scale;
  const cl = base.cl * scale;
  const ocf = base.ocf * scale;
  const icf = base.icf * scale;
  const fcf = base.fcf * scale;
  const divPaid = base.divPaid * scale;
  const cash = base.cash * scale;
  const invSec = base.invSec * scale;
  const cogs = base.cogs * scale;
  const gross = base.gross * scale;
  const sga = base.sga * scale;
  const eps = (base.eps * perShareScale).toFixed(2);
  const bps = (base.bps * Math.cbrt(scale)).toFixed(2);
  const dps = (base.dps * perShareScale).toFixed(2);
  const employees = Math.round(base.employees * headcountScale);
  const temp = Math.round(base.temp * headcountScale);
  const equityRatio = (eq / ta).toFixed(4);
  const roe = (net / eq).toFixed(4);
  const payout = (0.3 + (scale - 0.75) * 0.15).toFixed(4);
  const per = (14 + (scale - 0.75) * 8).toFixed(2);
  const pbr = (1.05 + (scale - 0.75) * 0.5).toFixed(2);

  const summary = {
    売上高: yen(sales),
    経常利益: yen(ord),
    包括利益: yen(comp),
    "親会社株主に帰属する当期純利益": yen(net),
    純資産額: yen(eq),
    総資産額: yen(ta),
    "１株当たり純資産額": bps,
    "１株当たり当期純利益又は当期純損失": eps,
    "潜在株式調整後１株当たり当期純利益": (parseFloat(eps) * 0.99).toFixed(2),
    自己資本比率: equityRatio,
    "自己資本利益率、経営指標等": roe,
    株価収益率: per,
    株価純資産倍率: pbr,
    営業活動によるキャッシュ・フロー: yen(ocf),
    投資活動によるキャッシュ・フロー: yen(icf),
    財務活動によるキャッシュ・フロー: yen(fcf),
    現金及び現金同等物の残高: yen(cash),
    従業員数: String(employees),
    平均臨時雇用人員: String(temp),
    配当性向: payout,
    "１株当たり配当額": dps,
    "発行済株式総数（普通株式）": yen(base.shares),
    資本金: yen(50_000_000_000 * scale),
  };
  const pl = {
    売上高: yen(sales),
    売上原価: yen(cogs),
    "売上総利益又は売上総損失（△)": yen(gross),
    "販売費及び一般管理費": yen(sga),
    営業利益: yen(op),
    経常利益: yen(ord),
    税引前利益: yen(ord * 0.98),
    "親会社株主に帰属する当期純利益": yen(net),
  };
  const bs = {
    総資産: yen(ta),
    流動資産: yen(ca),
    固定資産: yen(ta - ca),
    負債: yen(liab),
    純資産: yen(eq),
    流動負債: yen(cl),
    固定負債: yen(liab - cl),
    現金及び現金同等物: yen(cash),
    投資有価証券: yen(invSec),
  };
  const cf = {
    営業活動によるキャッシュ・フロー: yen(ocf),
    投資活動によるキャッシュ・フロー: yen(icf),
    財務活動によるキャッシュ・フロー: yen(fcf),
    配当金の支払額: yen(divPaid),
    現金及び現金同等物の期末残高: yen(cash),
  };
  return { summary, pl, bs, cf };
}

/** @type {{ docId: string, docType: string, docDescription: string, periodStart: string, periodEnd: string, submit: string, scale: number, perShareScale?: number }[]} */
const entries = [];

for (let i = 0; i < ANNUAL_FY.length; i++) {
  const fy = ANNUAL_FY[i];
  const m = mult[i];
  entries.push({
    docId: `SAMPLE-ANNUAL-${fy}`,
    docType: "annual",
    docDescription: "有価証券報告書",
    periodStart: `${fy - 1}-04-01`,
    periodEnd: `${fy}-03-31`,
    submit: `${fy}-06-28T09:00:00Z`,
    scale: m,
    perShareScale: m,
  });
}

for (const fy of ANNUAL_FY) {
  const i = ANNUAL_FY.indexOf(fy);
  const m = mult[i];
  const qDefs = [
    { q: 1, end: `${fy - 1}-06-30`, start: `${fy - 1}-04-01`, frac: 0.22 },
    { q: 2, end: `${fy - 1}-09-30`, start: `${fy - 1}-07-01`, frac: 0.24 },
    { q: 3, end: `${fy - 1}-12-31`, start: `${fy - 1}-10-01`, frac: 0.26 },
    { q: 4, end: `${fy}-03-31`, start: `${fy}-01-01`, frac: 0.28 },
  ];
  for (const q of qDefs) {
    entries.push({
      docId: `SAMPLE-Q${q.q}-${fy}`,
      docType: "quarterly",
      docDescription: "四半期報告書",
      periodStart: q.start,
      periodEnd: q.end,
      submit: `${q.end.slice(0, 4)}-${q.q === 4 ? "05" : String(7 + q.q * 3).padStart(2, "0")}-15T09:00:00Z`,
      scale: m * q.frac * 4,
      perShareScale: m * q.frac * 4,
    });
  }
}

for (let i = 0; i < ANNUAL_FY.length; i++) {
  const fy = ANNUAL_FY[i];
  const m = mult[i];
  entries.push({
    docId: `SAMPLE-SEMI-${fy}`,
    docType: "semiannual",
    docDescription: "半期報告書",
    periodStart: `${fy - 1}-04-01`,
    periodEnd: `${fy - 1}-09-30`,
    submit: `${fy - 1}-11-14T09:00:00Z`,
    scale: m * 0.48,
    perShareScale: m * 0.48,
  });
}

const lines = [
  "-- Generated by infra/init/generate-sample-seed.mjs — do not edit by hand.",
  "PRAGMA foreign_keys = ON;",
  "",
  `INSERT OR REPLACE INTO companies (
  edinet_code, sec_code, filer_name, listed_category, industry
) VALUES (
  'E00000', '9999', 'サンプル株式会社', '上場', '情報・通信業'
);`,
  "",
];

for (const e of entries) {
  lines.push(`INSERT OR REPLACE INTO documents (
  doc_id, edinet_code, sec_code, doc_type, ordinance_code, form_code, doc_type_code,
  period_start, period_end, submit_date_time, withdrawal_status, doc_description, source_meta_json
) VALUES (
  '${e.docId}', 'E00000', '9999', '${e.docType}',
  '010', '030000', '120', '${e.periodStart}', '${e.periodEnd}',
  '${e.submit}', '0', '${e.docDescription}',
  '{"source":"local-d1-seed"}'
);`);
  lines.push("");
}

for (const e of entries) {
  const blocks = buildBlocks(e.scale, { perShareScale: e.perShareScale ?? e.scale, headcountScale: 0.92 + (e.scale / 4) * 0.08 });
  lines.push(`INSERT OR REPLACE INTO period_financials (
  edinet_code, sec_code, doc_id, doc_type, period_start, period_end, submit_date_time, filer_name,
  summary_json, pl_json, bs_json, cf_json, raw_tsv_path
) VALUES (
  'E00000', '9999', '${e.docId}', '${e.docType}',
  '${e.periodStart}', '${e.periodEnd}', '${e.submit}', 'サンプル株式会社',
  '${j(blocks.summary)}',
  '${j(blocks.pl)}',
  '${j(blocks.bs)}',
  '${j(blocks.cf)}',
  NULL
);`);
  lines.push("");
}

lines.push(`INSERT OR REPLACE INTO sec_code_latest_periods (
  sec_code, edinet_code, filer_name, latest_doc_id, latest_period_end, latest_submit_date_time
) VALUES (
  '9999', 'E00000', 'サンプル株式会社', 'SAMPLE-ANNUAL-2025', '2025-03-31', '2025-06-28T09:00:00Z'
);`);
lines.push("");
lines.push(`INSERT OR REPLACE INTO daily_metrics (
  snapshot_date, company_count, document_count, period_financial_count
) VALUES (
  '2025-06-28', 1, ${entries.length}, ${entries.length}
);`);
lines.push("");

const seedPath = join(root, "infra/init/seed-local-d1.sql");
writeFileSync(seedPath, `${lines.join("\n")}\n`);
console.log(`Wrote ${seedPath} (${entries.length} periods)`);

const holderNames = [
  "サンプルホールディングス株式会社",
  "日本サンプル年金基金",
  "サンプルキャピタルパートナーズ",
  "東京サンプル信託銀行（信託口）",
  "グローバル・インデックス・ファンド",
];
const holderBase = [
  { shares: 128_600_000, ratio: 29.91 },
  { shares: 43_000_000, ratio: 10.0 },
  { shares: 25_800_000, ratio: 6.0 },
  { shares: 21_500_000, ratio: 5.0 },
  { shares: 17_200_000, ratio: 4.0 },
];

const periodEnds = [...new Set(entries.map((e) => e.periodEnd))].sort();
const shareholders = {
  secCode: "9999",
  periods: periodEnds.map((periodEnd, idx) => {
    const doc = entries.find((e) => e.periodEnd === periodEnd);
    const bump = idx * 0.02;
    return {
      periodEnd,
      docID: doc?.docId ?? "",
      shareholders: holderBase.map((h, rank) => ({
        rank: rank + 1,
        name: holderNames[rank],
        shares: String(Math.round(h.shares * (1 + bump * 0.1))),
        ratio: (h.ratio + bump).toFixed(2),
      })),
    };
  }),
};

const shPath = join(root, "apps/web/public/data/shareholders/9999.json");
writeFileSync(shPath, `${JSON.stringify(shareholders, null, 2)}\n`);
console.log(`Wrote ${shPath} (${periodEnds.length} periods)`);

const apiShareholders = {
  secCode: "9999",
  snapshots: shareholders.periods.map((p) => ({
    periodEnd: p.periodEnd,
    entries: p.shareholders.map((s) => ({
      name: s.name,
      shares: Number.parseInt(s.shares, 10),
      ratio: s.ratio != null ? Number.parseFloat(s.ratio) : null,
    })),
  })),
};
const apiSampleDir = join(root, "apps/api/src/sample");
mkdirSync(apiSampleDir, { recursive: true });
const apiShPath = join(apiSampleDir, "shareholders-9999.json");
writeFileSync(apiShPath, `${JSON.stringify(apiShareholders, null, 2)}\n`);
console.log(`Wrote ${apiShPath}`);
