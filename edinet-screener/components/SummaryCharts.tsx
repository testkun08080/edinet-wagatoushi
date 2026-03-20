"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

type Period = {
  periodEnd: string;
  summary: Record<string, string>;
  cf: Record<string, string>;
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

function chartColors() {
  if (typeof window === "undefined") {
    return { primary: "hsl(220 70% 46%)", secondary: "hsl(280 55% 48%)", muted: "hsl(220 10% 50%)" };
  }
  const root = document.documentElement;
  const s = getComputedStyle(root);
  const c1 = s.getPropertyValue("--chart-1").trim();
  const c2 = s.getPropertyValue("--chart-2").trim();
  const mf = s.getPropertyValue("--muted-foreground").trim();
  return {
    primary: c1 || "hsl(220 70% 46%)",
    secondary: c2 || "hsl(280 55% 48%)",
    muted: mf || "hsl(220 10% 45%)",
  };
}

export function SummaryCharts({ periods, metrics }: { periods: Period[]; metrics: DividendMetricsSnapshot }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { labels, salesBn, dividendPayBn } = useMemo(() => {
    const labels: string[] = [];
    const salesBn: (number | null)[] = [];
    const dividendPayBn: (number | null)[] = [];
    for (const p of periods) {
      labels.push(p.periodEnd);
      const sales = parseIntYen(p.summary?.["売上高"]);
      salesBn.push(sales != null ? toBillionsYen(sales) : null);
      const divPay = parseIntYen(p.cf?.["配当金の支払額"]);
      dividendPayBn.push(divPay != null ? toBillionsYen(Math.abs(divPay)) : null);
    }
    return { labels, salesBn, dividendPayBn };
  }, [periods]);

  const hasSales = salesBn.some((v) => v != null);
  const hasDividend = dividendPayBn.some((v) => v != null);

  if (!mounted) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-72 w-full rounded-lg" />
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    );
  }

  const { primary, secondary, muted } = chartColors();

  const salesData = {
    labels,
    datasets: [
      {
        label: "売上高（十億円）",
        data: salesBn.map((v) => (v == null ? NaN : v)),
        borderColor: primary,
        backgroundColor: `${primary}33`,
        fill: true,
        tension: 0.25,
        spanGaps: false,
      },
    ],
  };

  const dividendData = {
    labels,
    datasets: [
      {
        label: "配当金の支払額（十億円・CF）",
        data: dividendPayBn.map((v) => (v == null ? NaN : v)),
        backgroundColor: secondary,
        borderColor: secondary,
        borderWidth: 1,
      },
    ],
  };

  const axisCommon = {
    grid: { color: "rgba(120, 120, 120, 0.12)" },
    ticks: { color: muted, maxRotation: 45, minRotation: 0 },
  };

  const optionsLine = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: muted } },
      tooltip: {
        callbacks: {
          label: (ctx: { dataset?: { label?: string }; parsed?: { y: number } }) => {
            const v = ctx.parsed?.y;
            if (v == null || Number.isNaN(v)) return "";
            return `${ctx.dataset?.label ?? ""}: ${v.toLocaleString("ja-JP", { maximumFractionDigits: 1 })}`;
          },
        },
      },
    },
    scales: {
      x: axisCommon,
      y: {
        ...axisCommon,
        title: { display: true, text: "十億円", color: muted },
      },
    },
  };

  const optionsBar = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: muted } },
      tooltip: {
        callbacks: {
          label: (ctx: { dataset?: { label?: string }; parsed?: { y: number } }) => {
            const v = ctx.parsed?.y;
            if (v == null || Number.isNaN(v)) return "";
            return `${ctx.dataset?.label ?? ""}: ${v.toLocaleString("ja-JP", { maximumFractionDigits: 1 })}`;
          },
        },
      },
    },
    scales: {
      x: axisCommon,
      y: {
        ...axisCommon,
        title: { display: true, text: "十億円", color: muted },
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">売上高の推移</CardTitle>
            <CardDescription>四半期サマリー（summary）の「売上高」を基にしています。</CardDescription>
          </CardHeader>
          <CardContent className="h-64 pt-0 md:h-72">
            {hasSales ? (
              <Line data={salesData} options={optionsLine} />
            ) : (
              <p className="text-muted-foreground text-sm py-8 text-center">表示できる売上データがありません。</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">配当に関するキャッシュアウト</CardTitle>
            <CardDescription>
              キャッシュフロー計算書（cf）の「配当金の支払額」の絶対値を四半期ごとに表示しています。
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 pt-0 md:h-72">
            {hasDividend ? (
              <Bar data={dividendData} options={optionsBar} />
            ) : (
              <p className="text-muted-foreground text-sm py-8 text-center">
                このデータセットに「配当金の支払額」が含まれる期間がありません。
              </p>
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
              <CardDescription>
                企業指標（company_metrics）の最新値です。四半期サマリーに配当項目が無い場合の補足として利用できます。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <dt className="text-muted-foreground text-xs">1株当たり配当金</dt>
                  <dd className="font-semibold tabular-nums mt-1">
                    {metrics.dividendPerShare != null && metrics.dividendPerShare !== ""
                      ? metrics.dividendPerShare
                      : "―"}
                  </dd>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <dt className="text-muted-foreground text-xs">配当利回り</dt>
                  <dd className="font-semibold tabular-nums mt-1">
                    {metrics.配当利回り != null ? `${metrics.配当利回り.toFixed(2)}%` : "―"}
                  </dd>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <dt className="text-muted-foreground text-xs">配当性向</dt>
                  <dd className="font-semibold tabular-nums mt-1">
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
