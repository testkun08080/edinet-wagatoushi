/**
 * company_metrics 一覧・CSV・企業詳細で共有する数値表示。
 * 元データの金額は原則 EDINET 由来の円（文字列）、比率は 0〜1 前後の小数文字列。
 */

export function formatYenStringAsMillionYen(s: string | null | undefined): string {
  if (s == null || s === "") return "－";
  const n = Number.parseFloat(String(s).replace(/,/g, "")) / 1_000_000;
  if (Number.isNaN(n)) return "－";
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function formatRatioDecimalStringAsPercent(s: string | null | undefined): string {
  if (s == null || s === "") return "－";
  const n = Number.parseFloat(String(s).replace(/,/g, ""));
  if (Number.isNaN(n)) return String(s);
  return `${(n * 100).toFixed(2)}%`;
}

export function formatSharesCountString(s: string | null | undefined): string {
  if (s == null || s === "") return "－";
  const cleaned = String(s).replace(/,/g, "").trim();
  if (cleaned === "－" || cleaned === "-") return "－";
  const n = Number.parseInt(cleaned, 10);
  if (!Number.isFinite(n)) return "－";
  return n.toLocaleString("ja-JP");
}

/** サマリー表などで人数として扱う行キー（円換算しない）。DataTable で「全期 null でも行を残す」判定にも使う */
export const ANALYZE_HEADCOUNT_ROW_KEYS = new Set([
  "従業員数",
  "平均臨時雇用人員",
  "平均臨時雇用人数",
]);

/** サマリー等で小数比率（×100 で %）として扱う行キー */
const RATIO_DECIMAL_ROW_KEYS = new Set(["自己資本比率", "配当性向", "自己資本利益率、経営指標等"]);

function isPerShareOrMultipleRowKey(key: string): boolean {
  if (key === "株価収益率") return true;
  if (key.includes("株価純資産倍率")) return true;
  if (key.startsWith("１株当たり")) return true;
  return false;
}

/**
 * 企業詳細の PL/BS/CF/サマリー横断表のセル表示。
 * 行キーに応じて円→百万円、比率→%、人数→そのままなどを切り替える。
 */
export function formatAnalyzeFinancialTableCell(
  rowKey: string,
  raw: string | null | undefined,
): string {
  if (raw == null || raw === "" || raw === "－") return "－";
  const cleaned = String(raw).replace(/,/g, "").trim();
  if (cleaned === "－" || cleaned === "-") return "－";

  if (ANALYZE_HEADCOUNT_ROW_KEYS.has(rowKey)) {
    const n = Number.parseFloat(cleaned);
    if (!Number.isFinite(n)) return String(raw);
    return Math.round(n).toLocaleString("ja-JP");
  }

  if (RATIO_DECIMAL_ROW_KEYS.has(rowKey)) {
    const n = Number.parseFloat(cleaned);
    if (!Number.isFinite(n)) return String(raw);
    return `${(n * 100).toLocaleString("ja-JP", { maximumFractionDigits: 2 })}%`;
  }

  if (isPerShareOrMultipleRowKey(rowKey)) {
    const n = Number.parseFloat(cleaned);
    if (!Number.isFinite(n)) return String(raw);
    return n.toLocaleString("ja-JP", { maximumFractionDigits: 4 });
  }

  const n = Number.parseFloat(cleaned);
  if (Number.isNaN(n)) return String(raw);
  if (/[.]/.test(cleaned) && Math.abs(n) < 1_000_000) {
    return n.toLocaleString("ja-JP", { maximumFractionDigits: 4 });
  }
  const millions = n / 1_000_000;
  return millions.toLocaleString("ja-JP", { maximumFractionDigits: 2 });
}
