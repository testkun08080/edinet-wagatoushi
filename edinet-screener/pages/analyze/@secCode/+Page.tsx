"use client";

import { useEffect, useState } from "react";
import { useData } from "vike-react/useData";
import type { Data } from "./+data.js";
import type { CompanyMetricsRow } from "./+data.js";
import { useRecentCompanies } from "../../../components/RecentCompaniesContext.js";
import { useFavorites } from "../../../components/FavoritesContext.js";

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

function DataTable({
  title,
  data,
  periods,
}: {
  title: string;
  data: Record<string, string>[];
  periods: { periodEnd: string }[];
}) {
  const keys = new Set<string>();
  for (const row of data) {
    Object.keys(row).forEach((k) => keys.add(k));
  }
  const keyList = Array.from(keys).filter((k) => k && data.some((r) => r[k]));

  if (keyList.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold mb-4 text-slate-900">{title}</h2>
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-3 font-semibold text-slate-600 sticky left-0 bg-slate-50 z-20">項目</th>
              {periods.map((p) => (
                <th key={p.periodEnd} className="p-3 font-semibold text-slate-600 text-right whitespace-nowrap">
                  {p.periodEnd}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {keyList.map((key) => (
              <tr key={key}>
                <td className="p-3 font-medium bg-white sticky left-0 text-slate-900">{key}</td>
                {periods.map((p, i) => (
                  <td key={p.periodEnd} className="p-3 text-right tabular-nums text-slate-700">
                    {formatNum(data[i]?.[key] ?? "－")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type TabId = "keiei" | "zaimu" | "cf" | "shihyo";

function IndicatorsTab({ metrics }: { metrics: CompanyMetricsRow | null }) {
  if (!metrics) return <p className="text-slate-500 text-sm">指標データがありません。</p>;

  const items: { label: string; value: string | number | null; suffix?: string }[] = [
    { label: "PBR", value: metrics.PBR, suffix: "倍" },
    { label: "PER", value: metrics.PER, suffix: "倍" },
    { label: "配当利回り", value: metrics.配当利回り, suffix: "%" },
    { label: "ROE", value: metrics.ROE != null ? (parseFloat(metrics.ROE) * 100).toFixed(2) : null, suffix: "%" },
    { label: "自己資本比率", value: metrics.自己資本比率 != null ? (parseFloat(metrics.自己資本比率) * 100).toFixed(2) : null, suffix: "%" },
    { label: "EPS", value: metrics.EPS },
    { label: "BPS", value: metrics.BPS },
    { label: "配当性向", value: metrics.配当性向 != null ? (parseFloat(metrics.配当性向) * 100).toFixed(2) : null, suffix: "%" },
    { label: "1株当たり配当金", value: metrics.dividendPerShare, suffix: "円" },
    { label: "発行済株式総数", value: metrics.発行済株式総数 },
  ];

  const valid = items.filter((i) => i.value != null && i.value !== "");

  if (valid.length === 0) return <p className="text-slate-500 text-sm">表示できる指標がありません。</p>;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {valid.map(({ label, value, suffix }) => (
        <div key={label} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
          <p className="text-xl font-bold tabular-nums text-slate-900">
            {typeof value === "number" ? value.toLocaleString() : value}
            {suffix && <span className="text-xs font-normal text-slate-400 ml-1">{suffix}</span>}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function Page() {
  const { company, metrics, error } = useData<Data>();
  const { addRecent } = useRecentCompanies();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [activeTab, setActiveTab] = useState<TabId>("keiei");

  useEffect(() => {
    if (company) {
      addRecent(company.secCode, company.filerName);
    }
  }, [company?.secCode, company?.filerName, addRecent]);

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error}</p>
        <p className="text-slate-500 text-sm mt-2">左の企業一覧から別の企業を選択してください。</p>
      </div>
    );
  }

  if (!company) {
    return <p className="p-6 text-slate-500">データを読み込んでいます…</p>;
  }

  const { filerName, secCode, periods } = company;

  const tabs: { id: TabId; label: string }[] = [
    { id: "keiei", label: "経営成績" },
    { id: "zaimu", label: "財務諸表" },
    { id: "cf", label: "キャッシュフロー" },
    { id: "shihyo", label: "指標" },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* ヘッダー（Stitch 風） */}
      <header className="shrink-0 p-6 border-b border-slate-200">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold m-0 tracking-tight text-slate-900">
                {formatDisplayName(filerName)}（{secCode}）
              </h1>
            </div>
            <p className="text-slate-500 text-sm">EDINET 四半期報告書データ</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => toggleFavorite(secCode)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                isFavorite(secCode)
                  ? "bg-blue-600 text-white border border-transparent hover:bg-blue-700 shadow-sm"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span className="material-symbols-outlined text-lg">{isFavorite(secCode) ? "star" : "star_border"}</span>
              {isFavorite(secCode) ? "お気に入り登録済" : "お気に入りに追加"}
            </button>
          </div>
        </div>

        {/* KPI カード（時価総額は非表示） */}
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mt-6">
            {[
              { label: "PBR", value: metrics.PBR, suffix: "倍" },
              { label: "PER", value: metrics.PER, suffix: "倍" },
              { label: "配当利回り", value: metrics.配当利回り, suffix: "%" },
              { label: "ROE", value: metrics.ROE, suffix: "%", scale: 100 },
              { label: "自己資本比率", value: metrics.自己資本比率, suffix: "%", scale: 100 },
            ].map(({ label, value, suffix, scale }) => {
              const display =
                value != null
                  ? scale
                    ? (parseFloat(String(value)) * scale).toFixed(2)
                    : typeof value === "number"
                      ? value.toFixed(value >= 100 ? 0 : 2)
                      : value
                  : null;
              if (display == null) return null;
              return (
                <div key={label} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                  <p className="text-xl font-bold tabular-nums text-slate-900">
                    {display}
                    <span className="text-xs font-normal text-slate-400 ml-1">{suffix}</span>
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </header>

      {/* タブ */}
      <div className="shrink-0 px-6 border-b border-slate-200 sticky top-0 bg-white z-10">
        <nav className="flex gap-8">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? "text-blue-600 border-blue-600 font-semibold"
                  : "text-slate-500 hover:text-slate-800 border-transparent"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* タブコンテンツ */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "keiei" && (
          <DataTable title="経営成績" data={periods.map((p) => p.summary)} periods={periods} />
        )}

        {activeTab === "zaimu" && (
          <>
            <DataTable title="損益計算書" data={periods.map((p) => p.pl)} periods={periods} />
            <DataTable title="貸借対照表" data={periods.map((p) => p.bs)} periods={periods} />
          </>
        )}

        {activeTab === "cf" && <DataTable title="キャッシュフロー" data={periods.map((p) => p.cf)} periods={periods} />}

        {activeTab === "shihyo" && <IndicatorsTab metrics={metrics} />}
      </div>
    </div>
  );
}
