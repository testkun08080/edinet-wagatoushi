"use client";

import { useEffect, useState } from "react";
import { useData } from "vike-react/useData";
import type { Data, CompanyMetricsRow } from "./+data.js";
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
              <th className="p-3 font-semibold text-slate-600 sticky left-0 bg-slate-50 z-20 whitespace-nowrap">項目</th>
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
                <td className="p-3 font-medium bg-white sticky left-0 text-slate-900 whitespace-nowrap">{key}</td>
                {periods.map((p, i) => (
                  <td key={p.periodEnd} className="p-3 text-right tabular-nums text-slate-700 whitespace-nowrap">
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

const INDICATOR_KEYS: { key: keyof CompanyMetricsRow; label: string }[] = [
  { key: "計算日", label: "計算日" },
  { key: "決算月", label: "決算月" },
  { key: "売上高", label: "売上高" },
  { key: "営業利益", label: "営業利益" },
  { key: "経常利益", label: "経常利益" },
  { key: "当期純利益", label: "当期純利益" },
  { key: "包括利益", label: "包括利益" },
  { key: "EPS", label: "EPS" },
  { key: "BPS", label: "BPS" },
  { key: "ROE", label: "ROE" },
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
  { key: "財務CF", label: "財務CF" },
  { key: "現金残高", label: "現金残高" },
  { key: "配当性向", label: "配当性向" },
  { key: "dividendPerShare", label: "1株当たり配当金" },
  { key: "配当利回り", label: "配当利回り" },
  { key: "時価総額", label: "時価総額" },
  { key: "ネットキャッシュ", label: "ネットキャッシュ" },
  { key: "ネットキャッシュ比率", label: "ネットキャッシュ比率" },
  { key: "発行済株式総数", label: "発行済株式総数" },
  { key: "投資有価証券", label: "投資有価証券" },
];

function IndicatorsTable({
  metrics,
  formatNum,
}: {
  metrics: CompanyMetricsRow | null;
  formatNum: (s: string) => string;
}) {
  if (!metrics) {
    return (
      <section className="mb-8">
        <h2 className="text-lg font-bold mb-4 text-slate-900">指標</h2>
        <p className="text-slate-500">この企業の指標データはありません。</p>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold mb-4 text-slate-900">指標</h2>
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-3 font-semibold text-slate-600 text-left">項目</th>
              <th className="p-3 font-semibold text-slate-600 text-right">値</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {INDICATOR_KEYS.map(({ key, label }) => {
              const val = metrics[key];
              let display: string;
              if (val === null || val === undefined) {
                display = "－";
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
                <tr key={key}>
                  <td className="p-3 font-medium text-slate-900 whitespace-nowrap">{label}</td>
                  <td className="p-3 text-right tabular-nums text-slate-700 whitespace-nowrap">{display}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type TabId = "keiei" | "zaimu" | "cf" | "shihyo";

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

        {activeTab === "shihyo" && <IndicatorsTable metrics={metrics} formatNum={formatNum} />}
      </div>
    </div>
  );
}
