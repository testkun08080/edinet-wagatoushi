"use client";

import { useEffect, useMemo, useState } from "react";
import { useData } from "vike-react/useData";
import { useConfig } from "vike-react/useConfig";
import type { Data, CompanyMetricsRow } from "./+data.js";
import { useRecentCompanies } from "../../../components/RecentCompaniesContext.js";
import { useFavorites } from "../../../components/FavoritesContext.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { Skeleton } from "../../../components/ui/skeleton";
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
} from "lucide-react";
import { MajorShareholdersTimeSeries } from "../../../components/MajorShareholdersTimeSeries.js";
import { SummaryCharts } from "../../../components/SummaryCharts.js";
import { DataAttributionBlock } from "../../../components/DataAttributionBlock.js";
import { ToggleGroup, ToggleGroupItem } from "../../../components/ui/toggle-group";
import {
  ANALYZE_VISIBLE_YEAR_OPTIONS,
  filterPeriodsByVisibleYears,
  type AnalyzeVisibleYears,
} from "../../../lib/analyzePeriodRange.js";
import {
  ANALYZE_REPORT_KIND_OPTIONS,
  analyzeReportKindLabel,
  reportMatchesKind,
  type AnalyzeReportKind,
} from "../../../lib/analyzeReportKind.js";

function formatDisplayName(name: string): string {
  return name.replace(/^株式会社\s*|\s*株式会社$/g, "").trim() || name;
}

function formatNum(s: string): string {
  const n = parseInt(s, 10);
  if (isNaN(n)) return s;
  if (Math.abs(n) >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

/** 円ベースの整数を百万円に換算。小数を含み絶対値が小さいものは比率・EPS 等としてそのまま近い形で表示 */
function formatMillionYenCell(s: string): string {
  if (s == null || s === "" || s === "－") return "－";
  const cleaned = String(s).replace(/,/g, "").trim();
  if (cleaned === "－") return "－";
  const n = parseFloat(cleaned);
  if (Number.isNaN(n)) return s;
  if (/[.]/.test(cleaned) && Math.abs(n) < 1_000_000) {
    return n.toLocaleString("ja-JP", { maximumFractionDigits: 4 });
  }
  const millions = n / 1_000_000;
  return millions.toLocaleString("ja-JP", { maximumFractionDigits: 2 });
}

function DataTable({
  data,
  periods,
  unitCaption,
}: {
  data: Record<string, string>[];
  periods: { periodEnd: string }[];
  unitCaption?: string;
}) {
  const keys = new Set<string>();
  for (const row of data) {
    Object.keys(row).forEach((k) => keys.add(k));
  }
  const keyList = Array.from(keys).filter((k) => k && data.some((r) => r[k]));

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
                      {formatMillionYenCell(data[i]?.[key] ?? "－")}
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
  { key: "計算日", label: "計算日" },
  { key: "決算月", label: "決算月" },
  { key: "売上高", label: "売上高" },
  { key: "営業利益", label: "営業利益" },
  { key: "経常利益", label: "経常利益" },
  { key: "当期純利益", label: "当期純利益" },
  { key: "包括利益", label: "包括利益" },
  { key: "EPS", label: "EPS" },
  { key: "dilutedEPS", label: "希薄化EPS" },
  { key: "BPS", label: "BPS" },
  { key: "ROE", label: "ROE" },
  { key: "roeCalculated", label: "ROE（算出）" },
  { key: "roa", label: "ROA" },
  { key: "equityRatioCalculated", label: "自己資本比率（算出）" },
  { key: "PER", label: "PER" },
  { key: "PBR", label: "PBR" },
  { key: "純資産額", label: "純資産額" },
  { key: "総資産額", label: "総資産額" },
  { key: "自己資本比率", label: "自己資本比率" },
  { key: "流動資産", label: "流動資産" },
  { key: "流動負債", label: "流動負債" },
  { key: "負債", label: "負債" },
  { key: "営業CF", label: "営業CF" },
  { key: "投資CF", label: "投資CF" },
  { key: "fcf", label: "FCF" },
  { key: "財務CF", label: "財務CF" },
  { key: "現金残高", label: "現金残高" },
  { key: "配当性向", label: "配当性向" },
  { key: "payoutRatioComputed", label: "配当性向（算出）" },
  { key: "dividendPerShare", label: "1株当たり配当金" },
  { key: "配当利回り", label: "配当利回り" },
  { key: "時価総額", label: "時価総額" },
  { key: "ネットキャッシュ", label: "ネットキャッシュ" },
  { key: "ネットキャッシュ比率", label: "ネットキャッシュ比率" },
  { key: "発行済株式総数", label: "発行済株式総数" },
  { key: "投資有価証券", label: "投資有価証券" },
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
              } else if (
                (key === "ROE" ||
                  key === "自己資本比率" ||
                  key === "配当性向" ||
                  key === "roeCalculated" ||
                  key === "roa" ||
                  key === "equityRatioCalculated" ||
                  key === "payoutRatioComputed") &&
                typeof val === "string"
              ) {
                const n = parseFloat(val);
                display = Number.isFinite(n) ? `${(n * 100).toFixed(2)}%` : val;
              } else if (key === "ネットキャッシュ比率" && typeof val === "number") {
                display = (val * 100).toFixed(2) + "%";
              } else if (typeof val === "number") {
                if ((key === "時価総額" || key === "ネットキャッシュ") && Math.abs(val) >= 1000) {
                  display = formatNum(String(val));
                } else {
                  display = val.toLocaleString(undefined, { maximumFractionDigits: 2 });
                }
              } else {
                const s = String(val);
                const n = parseFloat(s);
                if (isNaN(n)) display = s;
                else if (Number.isInteger(n) && Math.abs(n) >= 1000) display = formatNum(s);
                else display = n.toLocaleString(undefined, { maximumFractionDigits: 4 });
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
  const { company, metrics, error } = useData<Data>();
  const config = useConfig();
  // data() 内では useConfig が使えない（getPageContext が無いと React フックに落ちる）。ページコンポーネントで設定する。
  config({
    title: company?.filerName ? `${company.filerName} - 企業分析 | エディー` : "企業分析 - エディー",
  });
  const { addRecent } = useRecentCompanies();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [mainTab, setMainTab] = useState("summary");
  const [analyzeVisibleYears, setAnalyzeVisibleYears] = useState<AnalyzeVisibleYears>(3);
  const [analyzeReportKind, setAnalyzeReportKind] = useState<AnalyzeReportKind>("quarter");

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
    "金額のセルは百万円単位（元データの円を 1,000,000 で割った値）です。比率・単価など非金額はそのまま表示します。";

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

  if (!company) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  const { filerName, secCode } = company;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 lg:px-6 lg:pt-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="text-xl font-bold tracking-tight">{formatDisplayName(filerName)}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{secCode}</Badge>
                <span>EDINET 四半期報告書データ</span>
              </CardDescription>
            </div>
            <CardAction>
              <Button
                variant={isFavorite(secCode) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleFavorite(secCode)}
              >
                <Star className={`size-4 ${isFavorite(secCode) ? "fill-current" : ""}`} />
                {isFavorite(secCode) ? "お気に入り登録済" : "お気に入りに追加"}
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
              <DataAttributionBlock compact />
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
