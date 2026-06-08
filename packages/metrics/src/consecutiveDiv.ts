import { annualPeriodsSortedDesc, parseDecimal, pickFromPeriod } from "./helpers.js";
import type { CompanySummary } from "./types.js";

/** Count consecutive annual DPS increases from the latest period backward. */
export function computeConsecutiveDivIncreases(periods: CompanySummary["periods"]): number | null {
  const annual = annualPeriodsSortedDesc(periods);
  if (annual.length < 2) return null;

  let count = 0;
  for (let i = 0; i < annual.length - 1; i++) {
    const curr = parseDecimal(pickFromPeriod(annual[i], "１株当たり配当額"));
    const prev = parseDecimal(pickFromPeriod(annual[i + 1], "１株当たり配当額"));
    if (curr == null || prev == null) {
      return i === 0 ? null : count;
    }
    if (curr > prev) {
      count++;
    } else {
      break;
    }
  }
  return count;
}
