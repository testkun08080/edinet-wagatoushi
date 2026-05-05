/** 分析ページで開示書類を切り替える単位（docDescription から判定） */
export const ANALYZE_REPORT_KIND_OPTIONS = ["quarter", "semiAnnual", "annual"] as const;
export type AnalyzeReportKind = (typeof ANALYZE_REPORT_KIND_OPTIONS)[number];

export const analyzeReportKindLabel: Record<AnalyzeReportKind, string> = {
  quarter: "四半期",
  semiAnnual: "半期",
  annual: "通期",
};

/**
 * EDINET の docDescription に基づき、選択中の表示単位に含めるか。
 * 分類不能な書類は四半期ビューにのみ含め、他ビューでは除外（重複列の温床になりにくい）。
 */
export function reportMatchesKind(docDescription: string | undefined, kind: AnalyzeReportKind): boolean {
  const d = docDescription ?? "";
  if (d.includes("四半期報告書")) return kind === "quarter";
  if (d.includes("半期報告書")) return kind === "semiAnnual";
  if (d.includes("有価証券報告書")) return kind === "annual";
  return kind === "quarter";
}
