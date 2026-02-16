import { useData } from "vike-react/useData";
import type { Data } from "./+data.js";

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
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <div className="overflow-x-auto">
        <table className="table table-zebra table-pin-rows table-pin-cols min-w-[600px]">
          <thead>
            <tr>
              <th className="bg-base-200 sticky left-0 z-10">項目</th>
              {periods.map((p) => (
                <th key={p.periodEnd} className=" whitespace-nowrap">
                  {p.periodEnd}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {keyList.map((key) => (
              <tr key={key}>
                <td className="font-medium bg-base-200/80 sticky left-0">{key}</td>
                {periods.map((p, i) => (
                  <td key={p.periodEnd} className="text-right tabular-nums">
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

export default function Page() {
  const { company, error } = useData<Data>();

  if (error) {
    return (
      <div>
        <p className="text-error">{error}</p>
        <p className="text-base-content/70 text-sm mt-2">左の企業一覧から別の企業を選択してください。</p>
      </div>
    );
  }

  if (!company) {
    return <p>データを読み込んでいます…</p>;
  }

  const { filerName, secCode, periods } = company;

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          {formatDisplayName(filerName)}（{secCode}）
        </h1>
        <p className="text-base-content/70 text-sm">EDINET 四半期報告書データ</p>
      </div>

      {/* 経営成績サマリ */}
      <DataTable
        title="経営成績"
        data={periods.map((p) => p.summary)}
        periods={periods}
      />

      {/* 損益計算書 */}
      <DataTable title="損益計算書" data={periods.map((p) => p.pl)} periods={periods} />

      {/* 貸借対照表 */}
      <DataTable title="貸借対照表" data={periods.map((p) => p.bs)} periods={periods} />

      {/* キャッシュフロー */}
      <DataTable title="キャッシュフロー" data={periods.map((p) => p.cf)} periods={periods} />
    </div>
  );
}
