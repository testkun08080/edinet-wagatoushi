import type { CompanySummary } from "./types.js";

export function compareSubmitDateTime(a: string, b: string): number {
  return a.localeCompare(b, "en");
}

export function parseYen(raw: string | null | undefined): number | null {
  if (raw == null || raw === "" || raw === "－") return null;
  const n = Number.parseFloat(String(raw).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function parseDecimal(raw: string | null | undefined): number | null {
  if (raw == null || raw === "" || raw === "－") return null;
  const n = Number.parseFloat(String(raw).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function growthRatio(current: number | null, previous: number | null): string | null {
  if (current == null || previous == null || previous === 0) return null;
  return String((current - previous) / Math.abs(previous));
}

export function cagrRatio(
  current: number | null,
  past: number | null,
  years: number,
): string | null {
  if (current == null || past == null || past <= 0 || years <= 0) return null;
  return String((current / past) ** (1 / years) - 1);
}

export function pickFromPeriod(
  period: CompanySummary["periods"][0],
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const v = period.summary[key] ?? period.pl[key] ?? period.bs[key] ?? period.cf[key];
    if (v != null && v !== "" && v !== "－") return v;
  }
  return null;
}

export function isAnnualPeriod(period: CompanySummary["periods"][0]): boolean {
  if (period.docDescription === "有価証券報告書") return true;
  return false;
}

export function annualPeriodsSortedDesc(
  periods: CompanySummary["periods"],
): CompanySummary["periods"] {
  return periods.filter(isAnnualPeriod).sort((a, b) => b.periodEnd.localeCompare(a.periodEnd));
}
