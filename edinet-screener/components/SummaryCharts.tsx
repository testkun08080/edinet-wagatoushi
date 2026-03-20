"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "./ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

type Period = {
  periodEnd: string;
  summary: Record<string, string>;
  cf: Record<string, string>;
  pl: Record<string, string>;
  bs: Record<string, string>;
};

/** 配当カード用（company_metrics の該当フィールドのみ） */
export type DividendMetricsSnapshot = {
  dividendPerShare: string | null;
  配当利回り: number | null;
  配当性向: string | null;
} | null;

function parseIntYen(raw: string | undefined): number | null {
  if (raw == null || raw === "" || raw === "－") return null;
  const n = parseInt(String(raw).replace(/,/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

function toBillionsYen(yen: number): number {
  return yen / 1_000_000_000;
}

function pickPlNetIncome(pl: Record<string, string>): number | null {
  return (
    parseIntYen(pl["親会社株主に帰属する当期純利益"]) ??
    parseIntYen(pl["親会社株主に帰属する四半期純利益"]) ??
    parseIntYen(pl["当期純利益"])
  );
}

const bnTooltipFormatter = (value: unknown) => {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return (
    <span className="font-mono tabular-nums">{value.toLocaleString("ja-JP", { maximumFractionDigits: 1 })} 十億円</span>
  );
};

const salesChartConfig = {
  sales: {
    label: "売上高",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const dividendChartConfig = {
  dividend: {
    label: "配当金の支払額",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const plChartConfig = {
  revenue: {
    label: "売上高",
    color: "var(--chart-1)",
  },
  operating: {
    label: "営業利益",
    color: "var(--chart-2)",
  },
  netIncome: {
    label: "親会社純利益",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const bsChartConfig = {
  totalAssets: {
    label: "総資産",
    color: "var(--chart-1)",
  },
  liabilities: {
    label: "負債",
    color: "var(--chart-4)",
  },
  netAssets: {
    label: "純資産",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig;

export function SummaryCharts({ periods, metrics }: { periods: Period[]; metrics: DividendMetricsSnapshot }) {
  const list = periods ?? [];
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const salesRows = useMemo(
    () =>
      list.map((p) => {
        const y = parseIntYen(p.summary?.["売上高"]);
        return {
          period: p.periodEnd,
          sales: y != null ? toBillionsYen(y) : null,
        };
      }),
    [list],
  );

  const dividendRows = useMemo(
    () =>
      list.map((p) => {
        const d = parseIntYen(p.cf?.["配当金の支払額"]);
        return {
          period: p.periodEnd,
          dividend: d != null ? toBillionsYen(Math.abs(d)) : null,
        };
      }),
    [list],
  );

  const plRows = useMemo(
    () =>
      list.map((p) => {
        const rev = parseIntYen(p.pl?.["売上高"]);
        const op = parseIntYen(p.pl?.["営業利益"]);
        const net = pickPlNetIncome(p.pl ?? {});
        return {
          period: p.periodEnd,
          revenue: rev != null ? toBillionsYen(rev) : null,
          operating: op != null ? toBillionsYen(op) : null,
          netIncome: net != null ? toBillionsYen(net) : null,
        };
      }),
    [list],
  );

  const bsRows = useMemo(
    () =>
      list.map((p) => {
        const bs = p.bs ?? {};
        const ta = parseIntYen(bs["総資産"]);
        const liab = parseIntYen(bs["負債"]);
        const eq = parseIntYen(bs["純資産"]);
        return {
          period: p.periodEnd,
          totalAssets: ta != null ? toBillionsYen(ta) : null,
          liabilities: liab != null ? toBillionsYen(liab) : null,
          netAssets: eq != null ? toBillionsYen(eq) : null,
        };
      }),
    [list],
  );

  const hasSales = salesRows.some((r) => r.sales != null);
  const hasDividend = dividendRows.some((r) => r.dividend != null);
  const hasPl = plRows.some((r) => r.revenue != null || r.operating != null || r.netIncome != null);
  const hasBs = bsRows.some((r) => r.totalAssets != null || r.liabilities != null || r.netAssets != null);

  const axisProps = {
    tickLine: false,
    axisLine: false,
    tickMargin: 8,
    minTickGap: 24,
  };

  if (!mounted) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-72 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">売上高の推移</CardTitle>
            <CardDescription>四半期サマリー（summary）の「売上高」</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {hasSales ? (
              <ChartContainer config={salesChartConfig} className="aspect-auto h-64 w-full md:h-72">
                <AreaChart accessibilityLayer data={salesRows} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="period" {...axisProps} tickFormatter={(v) => String(v).slice(0, 7)} />
                  <YAxis {...axisProps} width={40} tickFormatter={(v) => String(v)} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent formatter={bnTooltipFormatter} indicator="line" />}
                  />
                  <Area
                    dataKey="sales"
                    type="natural"
                    fill="var(--color-sales)"
                    fillOpacity={0.35}
                    stroke="var(--color-sales)"
                    strokeWidth={1.5}
                    connectNulls
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground py-10 text-center text-sm">表示できる売上データがありません。</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">配当に関するキャッシュアウト</CardTitle>
            <CardDescription>CF の「配当金の支払額」（絶対値・十億円）</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {hasDividend ? (
              <ChartContainer config={dividendChartConfig} className="aspect-auto h-64 w-full md:h-72">
                <AreaChart accessibilityLayer data={dividendRows} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="period" {...axisProps} tickFormatter={(v) => String(v).slice(0, 7)} />
                  <YAxis {...axisProps} width={40} tickFormatter={(v) => String(v)} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent formatter={bnTooltipFormatter} indicator="line" />}
                  />
                  <Area
                    dataKey="dividend"
                    type="natural"
                    fill="var(--color-dividend)"
                    fillOpacity={0.35}
                    stroke="var(--color-dividend)"
                    strokeWidth={1.5}
                    connectNulls
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground py-10 text-center text-sm">
                「配当金の支払額」が含まれる期間がありません。
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">損益計算書（PL）の推移</CardTitle>
            <CardDescription>売上高・営業利益・親会社帰属純利益（十億円）</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {hasPl ? (
              <ChartContainer config={plChartConfig} className="aspect-auto h-64 w-full md:h-80">
                <AreaChart accessibilityLayer data={plRows} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="period" {...axisProps} tickFormatter={(v) => String(v).slice(0, 7)} />
                  <YAxis {...axisProps} width={40} tickFormatter={(v) => String(v)} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent formatter={bnTooltipFormatter} indicator="line" />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    dataKey="revenue"
                    type="natural"
                    fill="var(--color-revenue)"
                    fillOpacity={0.25}
                    stroke="var(--color-revenue)"
                    strokeWidth={1.25}
                    connectNulls
                  />
                  <Area
                    dataKey="operating"
                    type="natural"
                    fill="var(--color-operating)"
                    fillOpacity={0.25}
                    stroke="var(--color-operating)"
                    strokeWidth={1.25}
                    connectNulls
                  />
                  <Area
                    dataKey="netIncome"
                    type="natural"
                    fill="var(--color-netIncome)"
                    fillOpacity={0.25}
                    stroke="var(--color-netIncome)"
                    strokeWidth={1.25}
                    connectNulls
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground py-10 text-center text-sm">PL の数値が取得できません。</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">貸借対照表（BS）の推移</CardTitle>
            <CardDescription>総資産・負債・純資産（十億円）</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {hasBs ? (
              <ChartContainer config={bsChartConfig} className="aspect-auto h-64 w-full md:h-80">
                <AreaChart accessibilityLayer data={bsRows} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="period" {...axisProps} tickFormatter={(v) => String(v).slice(0, 7)} />
                  <YAxis {...axisProps} width={40} tickFormatter={(v) => String(v)} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent formatter={bnTooltipFormatter} indicator="line" />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    dataKey="totalAssets"
                    type="natural"
                    fill="var(--color-totalAssets)"
                    fillOpacity={0.22}
                    stroke="var(--color-totalAssets)"
                    strokeWidth={1.25}
                    connectNulls
                  />
                  <Area
                    dataKey="liabilities"
                    type="natural"
                    fill="var(--color-liabilities)"
                    fillOpacity={0.22}
                    stroke="var(--color-liabilities)"
                    strokeWidth={1.25}
                    connectNulls
                  />
                  <Area
                    dataKey="netAssets"
                    type="natural"
                    fill="var(--color-netAssets)"
                    fillOpacity={0.22}
                    stroke="var(--color-netAssets)"
                    strokeWidth={1.25}
                    connectNulls
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground py-10 text-center text-sm">BS の数値が取得できません。</p>
            )}
          </CardContent>
        </Card>
      </div>

      {metrics &&
        (metrics.dividendPerShare != null ||
          metrics.配当利回り != null ||
          (metrics.配当性向 != null && metrics.配当性向 !== "")) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">配当まわり（最新スナップショット）</CardTitle>
              <CardDescription>企業指標（company_metrics）の最新値</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <dt className="text-muted-foreground text-xs">1株当たり配当金</dt>
                  <dd className="mt-1 font-semibold tabular-nums">
                    {metrics.dividendPerShare != null && metrics.dividendPerShare !== ""
                      ? metrics.dividendPerShare
                      : "―"}
                  </dd>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <dt className="text-muted-foreground text-xs">配当利回り</dt>
                  <dd className="mt-1 font-semibold tabular-nums">
                    {metrics.配当利回り != null ? `${metrics.配当利回り.toFixed(2)}%` : "―"}
                  </dd>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <dt className="text-muted-foreground text-xs">配当性向</dt>
                  <dd className="mt-1 font-semibold tabular-nums">
                    {metrics.配当性向 != null && metrics.配当性向 !== ""
                      ? (() => {
                          const r = parseFloat(metrics.配当性向);
                          return Number.isFinite(r) ? `${(r * 100).toFixed(2)}%` : metrics.配当性向;
                        })()
                      : "―"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
