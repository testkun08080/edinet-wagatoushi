/** サマリー（グラフ・表）の表示期間プリセット */
export const SUMMARY_VISIBLE_YEAR_OPTIONS = [3, 5, 10] as const;
export type SummaryVisibleYears = (typeof SUMMARY_VISIBLE_YEAR_OPTIONS)[number];

function parsePeriodEndLocal(iso: string): Date | null {
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

function toIsoDateLocal(d: Date): string {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** 基準日から指定年数前の同日（ローカル暦）。比較は YYYY-MM-DD の辞書順で行う。 */
function subtractYearsFromIso(iso: string, years: number): string | null {
  const d = parsePeriodEndLocal(iso);
  if (!d) return null;
  d.setFullYear(d.getFullYear() - years);
  return toIsoDateLocal(d);
}

/**
 * 最新の決算期末を基準に、そこから遡って `years` 年分の期間だけ残す（同日を含む）。
 * 時系列は periodEnd 昇順にそろえる。
 */
export function filterPeriodsByVisibleYears<T extends { periodEnd: string }>(
  periods: readonly T[],
  years: SummaryVisibleYears,
): T[] {
  if (periods.length === 0) return [];
  const sorted = [...periods].sort((a, b) => a.periodEnd.localeCompare(b.periodEnd));
  const latest = sorted[sorted.length - 1]!.periodEnd;
  const cutoff = subtractYearsFromIso(latest, years);
  if (cutoff == null) return sorted;
  return sorted.filter((p) => p.periodEnd >= cutoff);
}
