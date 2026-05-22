"use client";

import { useEffect, useMemo, useState } from "react";
import { useConfig } from "vike-react/useConfig";
import { usePageContext } from "vike-react/usePageContext";
import { normalizeCompanySummary, type CompanySummary, type CompanyMetricsRow } from "./companyData.js";
import { useRecentCompanies } from "../../../../components/RecentCompaniesContext.js";
import { useFavorites } from "../../../../components/FavoritesContext.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../../components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Badge } from "../../../../components/ui/badge";
import { Alert, AlertDescription } from "../../../../components/ui/alert";
import { Skeleton } from "../../../../components/ui/skeleton";
import {
  Star,
  AlertCircle,
  FileText,
  BarChart3,
  TrendingUp,
  Wallet,
  Banknote,
  Users,
  CalendarRange,
  ExternalLink,
} from "lucide-react";
import { SITE_NAME } from "../../../../lib/brand";
import { MajorShareholdersTimeSeries } from "../../../../components/MajorShareholdersTimeSeries.js";
import { SummaryCharts } from "../../../../components/SummaryCharts.js";
import { ToggleGroup, ToggleGroupItem } from "../../../../components/ui/toggle-group";
import {
  ANALYZE_VISIBLE_YEAR_OPTIONS,
  filterPeriodsByVisibleYears,
  type AnalyzeVisibleYears,
} from "../../../../lib/analyze-period-range.js";
import {
  ANALYZE_REPORT_KIND_OPTIONS,
  analyzeReportKindLabel,
  reportMatchesKind,
  type AnalyzeReportKind,
} from "../../../../lib/analyze-report-kind.js";
import {
  ANALYZE_HEADCOUNT_ROW_KEYS,
  formatAnalyzeFinancialTableCell,
  formatRatioDecimalStringAsPercent,
  formatSharesCountString,
  formatYenStringAsMillionYen,
} from "../../../../lib/metricFormat.js";

function formatDisplayName(name: string): string {
  return name.replace(/^株式会社\s*|\s*株式会社$/g, "").trim() || name;
}

const INDICATOR_YEN_STRING_KEYS = new Set<keyof CompanyMetricsRow>([
  "sales",
  "operatingProfit",
  "recurringProfit",
  "netIncome",
  "comprehensiveIncome",
  "netAssets",
  "totalAssets",
  "currentAssets",
  "currentLiabilities",
  "liabilities",
  "operatingCF",
  "investingCF",
  "fcf",
  "financingCF",
  "cashBalance",
  "investmentSecurities",
]);

const INDICATOR_PER_SHARE_STRING_KEYS = new Set<keyof CompanyMetricsRow>([
  "EPS",
  "dilutedEPS",
  "BPS",
  "dividendPerShare",
]);

function hasRenderableTableCell(v: unknown): boolean {
  if (v == null) return false;
  const t = String(v).replace(/,/g, "").trim();
  return t !== "" && t !== "－" && t !== "-";
}

function EdinetLinksCard({
  periods,
}: {
  periods: { periodEnd: string; docID?: string; docDescription?: string; submitDateTime?: string }[];
}) {
  const links = periods.filter((p) => p.docID);
  if (links.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ExternalLink className="size-4 text-muted-foreground" />
          出典・参考リンク（EDINET 開示書類）
        </CardTitle>
        <CardDescription className="text-xs">
          本ページのデータは、以下の EDINET 開示書類をもとに加工・集計したものです。
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="divide-y">
          {links.map((p) => (
            <li key={p.docID} className="flex items-center justify-between gap-4 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{p.docDescription ?? p.periodEnd}</p>
                <p className="text-muted-foreground text-xs">
                  決算期末: {p.periodEnd}
                  {p.submitDateTime ? `  提出: ${p.submitDateTime}` : ""}
                </p>
              </div>
              <a
                href={`https://disclosure2.edinet-fsa.go.jp/WZEK0040.aspx?${p.docID},,`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary shrink-0 text-xs underline-offset-2 hover:underline flex items-center gap-1"
              >
                EDINET で見る
                <ExternalLink className="size-3" />
              </a>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function DataTable({
  data,
  periods,
  unitCaption,
}: {
  data: Record<string, string>[];
  periods: { periodEnd: string; docID?: string; docDescription?: string }[];
  unitCaption?: string;
}) {
  const keys = new Set<string>();
  for (const row of data) {
    Object.keys(row).forEach((k) => keys.add(k));
  }
  /** 人数行は全期 null のときも表示（四半期だけ見ていると欠損が続き、truthy 判定で行ごと消えていた） */
  const keyList = Array.from(keys).filter((k) => {
    if (!k) return false;
    if (ANALYZE_HEADCOUNT_ROW_KEYS.has(k)) return true;
    return data.some((r) => hasRenderableTableCell(r[k]));
  });

  if (keyList.length === 0) return null;

  return (
    <Card>
      {unitCaption ? <div className="text-muted-foreground border-b px-4 py-2 text-xs">{unitCaption}</div> : null}
      <CardContent className="p-0">
        <div className="rounded-lg border-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="sticky left-0 z-20 bg-background font-semibold">項目</TableHead>
                {periods.map((p) => (
                  <TableHead key={p.periodEnd} className="text-right font-semibold">
                    {p.periodEnd}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {keyList.map((key) => (
                <TableRow key={key}>
                  <TableCell className="font-medium sticky left-0 bg-background">{key}</TableCell>
                  {periods.map((p, i) => (
                    <TableCell key={p.periodEnd} className="text-right tabular-nums">
                      {formatAnalyzeFinancialTableCell(key, data[i]?.[key] ?? "－")}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

const INDICATOR_KEYS: { key: keyof CompanyMetricsRow; label: string }[] = [
  { key: "calcDate", label: "計算日" },
  { key: "fiscalMonth", label: "決算月" },
  { key: "sales", label: "売上高（百万円）" },
  { key: "operatingProfit", label: "営業利益（百万円）" },
  { key: "recurringProfit", label: "経常利益（百万円）" },
  { key: "netIncome", label: "当期純利益（百万円）" },
  { key: "comprehensiveIncome", label: "包括利益（百万円）" },
  { key: "EPS", label: "EPS（円）" },
  { key: "dilutedEPS", label: "希薄化EPS（円）" },
  { key: "BPS", label: "BPS（円）" },
  { key: "ROE", label: "ROE（%）" },
  { key: "roeCalculated", label: "ROE（算出・%）" },
  { key: "roa", label: "ROA（%）" },
  { key: "equityRatioCalculated", label: "自己資本比率（算出・%）" },
  { key: "PER", label: "PER（倍）" },
  { key: "PBR", label: "PBR（倍）" },
  { key: "netAssets", label: "純資産額（百万円）" },
  { key: "totalAssets", label: "総資産額（百万円）" },
  { key: "equityRatio", label: "自己資本比率（%）" },
  { key: "currentAssets", label: "流動資産（百万円）" },
  { key: "currentLiabilities", label: "流動負債（百万円）" },
  { key: "liabilities", label: "負債（百万円）" },
  { key: "operatingCF", label: "営業CF（百万円）" },
  { key: "investingCF", label: "投資CF（百万円）" },
  { key: "fcf", label: "FCF（百万円）" },
  { key: "financingCF", label: "財務CF（百万円）" },
  { key: "cashBalance", label: "現金及び現金同等物（百万円）" },
  { key: "payoutRatio", label: "配当性向（%）" },
  { key: "payoutRatioComputed", label: "配当性向（算出・%）" },
  { key: "dividendPerShare", label: "1株当たり配当金（円）" },
  { key: "dividendYield", label: "配当利回り（%）" },
  { key: "marketCap", label: "時価総額（百万円）" },
  { key: "netCash", label: "ネットキャッシュ（百万円）" },
  { key: "netCashRatio", label: "ネットキャッシュ比率（%）" },
  { key: "sharesOutstanding", label: "発行済株式総数（株）" },
  { key: "investmentSecurities", label: "投資有価証券（百万円）" },
  { key: "salesGrowthYoY", label: "売上高成長率(YoY)（%）" },
  { key: "opGrowthYoY", label: "営業利益成長率(YoY)（%）" },
  { key: "epsGrowthYoY", label: "EPS成長率(YoY)（%）" },
  { key: "dividendGrowthYoY", label: "配当成長率(YoY)（%）" },
  { key: "salesCagr3y", label: "売上高CAGR(3年)（%）" },
  { key: "salesCagr5y", label: "売上高CAGR(5年)（%）" },
  { key: "consecutiveDivIncreases", label: "連続増配年数" },
  { key: "currentRatio", label: "流動比率" },
  { key: "deRatio", label: "D/Eレシオ" },
  { key: "roic", label: "ROIC（%）" },
  { key: "piotroskiFScore", label: "Piotroski F-Score" },
];

function IndicatorsTable({ metrics }: { metrics: CompanyMetricsRow | null }) {
  if (!metrics) {
    return (
      <Alert>
        <AlertCircle className="size-4" />
        <AlertDescription>この企業の指標データはありません。</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <p className="text-muted-foreground border-b px-4 py-2 text-xs leading-relaxed">
          金額は百万円（元データは円÷1,000,000）。比率・成長率・ROIC は小数を×100して % 表示。PER・PBR
          は倍。EPS・BPS・1株配当は円。発行済株式総数は株。
        </p>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-semibold">項目</TableHead>
              <TableHead className="text-right font-semibold">値</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {INDICATOR_KEYS.map(({ key, label }) => {
              const val = metrics[key];
              let display: string;
              if (val === null || val === undefined) {
                display = "－";
              } else if (key === "calcDate" || key === "fiscalMonth") {
                display = String(val);
              } else if (key === "piotroskiFScore" && typeof val === "number") {
                display = String(val);
              } else if (key === "consecutiveDivIncreases" && typeof val === "number") {
                display = `${val}年`;
              } else if ((key === "currentRatio" || key === "deRatio") && typeof val === "number") {
                display = val.toFixed(2);
              } else if (key === "roic" && typeof val === "number") {
                display = (val * 100).toFixed(2) + "%";
              } else if (
                (key === "ROE" ||
                  key === "equityRatio" ||
                  key === "payoutRatio" ||
                  key === "roeCalculated" ||
                  key === "roa" ||
                  key === "equityRatioCalculated" ||
                  key === "payoutRatioComputed" ||
                  key === "salesGrowthYoY" ||
                  key === "opGrowthYoY" ||
                  key === "epsGrowthYoY" ||
                  key === "dividendGrowthYoY" ||
                  key === "salesCagr3y" ||
                  key === "salesCagr5y") &&
                typeof val === "string"
              ) {
                display = formatRatioDecimalStringAsPercent(val);
              } else if (key === "netCashRatio" && typeof val === "number") {
                display = (val * 100).toFixed(2) + "%";
              } else if (key === "dividendYield" && typeof val === "number") {
                display = val.toFixed(2) + "%";
              } else if (typeof val === "number") {
                if (key === "PER") {
                  display = val.toFixed(1);
                } else if (key === "PBR") {
                  display = val.toFixed(2);
                } else if (key === "dividendYield") {
                  display = val.toFixed(2) + "%";
                } else if (key === "marketCap" || key === "netCash") {
                  display = formatYenStringAsMillionYen(String(val));
                } else {
                  display = val.toLocaleString(undefined, { maximumFractionDigits: 2 });
                }
              } else if (typeof val === "string") {
                if (INDICATOR_YEN_STRING_KEYS.has(key)) {
                  display = formatYenStringAsMillionYen(val);
                } else if (key === "sharesOutstanding") {
                  display = formatSharesCountString(val);
                } else if (INDICATOR_PER_SHARE_STRING_KEYS.has(key)) {
                  const n = parseFloat(val.replace(/,/g, ""));
                  display = Number.isFinite(n) ? n.toLocaleString("ja-JP", { maximumFractionDigits: 4 }) : val;
                } else {
                  display = val;
                }
              } else {
                display = String(val);
              }
              return (
                <TableRow key={key}>
                  <TableCell className="font-medium">{label}</TableCell>
                  <TableCell className="text-right tabular-nums">{display}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function Page() {
  const pageContext = usePageContext();
  const secCode = pageContext.routeParams?.secCode;
  const [company, setCompany] = useState<CompanySummary | null>(null);
  const [metrics, setMetrics] = useState<CompanyMetricsRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const config = useConfig();
  // data() 内では useConfig が使えない（getPageContext が無いと React フックに落ちる）。ページコンポーネントで設定する。
  config({
    title: company?.filerName ? `${company.filerName} - 企業分析 | ${SITE_NAME}` : `企業分析 - ${SITE_NAME}`,
  });
  const { addRecent } = useRecentCompanies();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [mainTab, setMainTab] = useState("summary");
  const [analyzeVisibleYears, setAnalyzeVisibleYears] = useState<AnalyzeVisibleYears>(3);
  const [analyzeReportKind, setAnalyzeReportKind] = useState<AnalyzeReportKind>("quarter");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!secCode) {
        if (!cancelled) {
          setCompany(null);
          setMetrics(null);
          setError("証券コードが指定されていません");
          setLoading(false);
        }
        return;
      }
      if (!cancelled) {
        setLoading(true);
        setError(null);
      }
      try {
        const [companyRes, metricsRes] = await Promise.all([
          fetch(`/data/summaries/${secCode}.json`),
          fetch("/data/company_metrics.json"),
        ]);
        if (!companyRes.ok) {
          if (companyRes.status === 404) {
            if (!cancelled) {
              setCompany(null);
              setMetrics(null);
              setError(`証券コード ${secCode} のデータが見つかりません。企業一覧から選択してください。`);
              setLoading(false);
            }
            return;
          }
          throw new Error(`HTTP ${companyRes.status}`);
        }
        const nextCompany = normalizeCompanySummary(await companyRes.json(), secCode);
        let nextMetrics: CompanyMetricsRow | null = null;
        if (metricsRes.ok) {
          const metricsData = (await metricsRes.json()) as { metrics?: CompanyMetricsRow[] };
          nextMetrics = metricsData.metrics?.find((m) => m.secCode === secCode) ?? null;
        }
        if (!cancelled) {
          setCompany(nextCompany);
          setMetrics(nextMetrics);
          setError(null);
          setLoading(false);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) {
          setCompany(null);
          setMetrics(null);
          setError(`データの取得に失敗しました: ${msg}`);
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [secCode]);

  useEffect(() => {
    if (company) {
      addRecent(company.secCode, company.filerName);
    }
  }, [company?.secCode, company?.filerName, addRecent]);

  useEffect(() => {
    setMainTab("summary");
  }, [company?.secCode]);

  useEffect(() => {
    setAnalyzeVisibleYears(3);
    setAnalyzeReportKind("quarter");
  }, [company?.secCode]);

  const periods = company?.periods ?? [];
  const reportFilteredPeriods = useMemo(
    () => periods.filter((p) => reportMatchesKind(p.docDescription, analyzeReportKind)),
    [periods, analyzeReportKind],
  );
  const filteredPeriods = useMemo(
    () => filterPeriodsByVisibleYears(reportFilteredPeriods, analyzeVisibleYears),
    [reportFilteredPeriods, analyzeVisibleYears],
  );

  const tableMillionCaption =
    "円建の金額科目は百万円（÷1,000,000）。自己資本比率・配当性向・ROE 等は %（小数×100）。従業員数・平均臨時雇用人員は名（換算なし）。１株当たり項目・PER は換算なし。";

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>
            {error}
            <br />
            <span className="text-xs mt-1 block">左の企業一覧から別の企業を選択してください。</span>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading || !company) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const { filerName, secCode: companySecCode } = company;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 lg:px-6 lg:pt-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="text-xl font-bold tracking-tight">{formatDisplayName(filerName)}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{companySecCode}</Badge>
                <span>EDINET 四半期報告書データ</span>
              </CardDescription>
            </div>
            <CardAction>
              <Button
                variant={isFavorite(companySecCode) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleFavorite(companySecCode)}
              >
                <Star className={`size-4 ${isFavorite(companySecCode) ? "fill-current" : ""}`} />
                {isFavorite(companySecCode) ? "お気に入り登録済" : "お気に入りに追加"}
              </Button>
            </CardAction>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex-1 min-h-0 overflow-hidden px-4 py-4 lg:px-6">
        <Tabs value={mainTab} onValueChange={setMainTab} className="h-full flex flex-col min-h-0">
          <div className="bg-background/90 supports-backdrop-filter:bg-background/75 sticky top-0 z-30 -mx-4 mb-2 border-b border-border/70 px-4 py-2.5 backdrop-blur-md lg:-mx-6 lg:px-6">
            <div className="flex flex-col gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <CalendarRange className="text-muted-foreground size-4 shrink-0" aria-hidden />
                <span className="text-sm font-medium">開示・期間</span>
                <span className="text-muted-foreground text-xs">
                  書類の種類と年数は全タブ共通（同一決算期末の重複提出はサーバ側で除去済み）
                </span>
              </div>
              <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
                <ToggleGroup
                  type="single"
                  value={analyzeReportKind}
                  onValueChange={(v: string) => {
                    if (!v) return;
                    if ((ANALYZE_REPORT_KIND_OPTIONS as readonly string[]).includes(v)) {
                      setAnalyzeReportKind(v as AnalyzeReportKind);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full shrink-0 gap-0 lg:w-fit"
                >
                  {ANALYZE_REPORT_KIND_OPTIONS.map((k) => (
                    <ToggleGroupItem
                      key={k}
                      value={k}
                      aria-label={`${analyzeReportKindLabel[k]}報告書のみ表示`}
                      className="min-w-0 flex-1 px-2.5 lg:flex-none lg:px-3 data-[state=on]:bg-accent"
                    >
                      {analyzeReportKindLabel[k]}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <ToggleGroup
                  type="single"
                  value={String(analyzeVisibleYears)}
                  onValueChange={(v: string) => {
                    if (!v) return;
                    const n = Number(v);
                    if ((ANALYZE_VISIBLE_YEAR_OPTIONS as readonly number[]).includes(n)) {
                      setAnalyzeVisibleYears(n as AnalyzeVisibleYears);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="w-full shrink-0 gap-0 lg:w-fit"
                >
                  {ANALYZE_VISIBLE_YEAR_OPTIONS.map((y) => (
                    <ToggleGroupItem
                      key={y}
                      value={String(y)}
                      aria-label={`${y}年分表示`}
                      className="min-w-0 flex-1 px-2.5 lg:flex-none lg:min-w-[2.75rem] lg:px-3 data-[state=on]:bg-accent"
                    >
                      {y}年
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            </div>
          </div>
          <TabsList variant="line" className="w-full justify-start shrink-0 overflow-x-auto">
            <TabsTrigger value="summary" className="gap-1.5">
              <FileText className="size-3.5" />
              サマリー
            </TabsTrigger>
            <TabsTrigger value="shihyo" className="gap-1.5">
              <BarChart3 className="size-3.5" />
              指標
            </TabsTrigger>
            <TabsTrigger value="shareholders" className="gap-1.5">
              <Users className="size-3.5" />
              大株主
            </TabsTrigger>
            <TabsTrigger value="pl" className="gap-1.5">
              <TrendingUp className="size-3.5" />
              損益計算書
            </TabsTrigger>
            <TabsTrigger value="bs" className="gap-1.5">
              <Wallet className="size-3.5" />
              貸借対照表
            </TabsTrigger>
            <TabsTrigger value="cf" className="gap-1.5">
              <Banknote className="size-3.5" />
              キャッシュフロー計算書
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 min-h-0 overflow-auto mt-4">
            <TabsContent value="summary" className="min-h-0 space-y-6">
              <SummaryCharts periods={filteredPeriods} metrics={metrics} />
              <DataTable
                data={filteredPeriods.map((p) => p.summary)}
                periods={filteredPeriods}
                unitCaption={tableMillionCaption}
              />
              <EdinetLinksCard periods={filteredPeriods} />
            </TabsContent>
            <TabsContent value="shihyo" className="min-h-0">
              <IndicatorsTable metrics={metrics} />
            </TabsContent>
            <TabsContent value="shareholders" className="min-h-0">
              <MajorShareholdersTimeSeries periods={filteredPeriods} active={mainTab === "shareholders"} />
            </TabsContent>
            <TabsContent value="pl" className="min-h-0">
              <DataTable
                data={filteredPeriods.map((p) => p.pl)}
                periods={filteredPeriods}
                unitCaption={tableMillionCaption}
              />
            </TabsContent>
            <TabsContent value="bs" className="min-h-0">
              <DataTable
                data={filteredPeriods.map((p) => p.bs)}
                periods={filteredPeriods}
                unitCaption={tableMillionCaption}
              />
            </TabsContent>
            <TabsContent value="cf" className="min-h-0">
              <DataTable
                data={filteredPeriods.map((p) => p.cf)}
                periods={filteredPeriods}
                unitCaption={tableMillionCaption}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
