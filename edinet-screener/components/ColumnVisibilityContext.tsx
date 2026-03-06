"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export type ColumnId =
  | "filerName"
  | "secCode"
  | "edinetCode"
  | "calcDate"
  | "fiscalMonth"
  | "PBR"
  | "PER"
  | "payoutRatio"
  | "dividendYield"
  | "marketCap"
  | "netCash"
  | "netCashRatio"
  | "EPS"
  | "ROE"
  | "equityRatio"
  | "BPS"
  | "dividendPerShare"
  | "sharesOutstanding"
  | "sales"
  | "operatingProfit"
  | "recurringProfit"
  | "operatingProfitRatio"
  | "netIncome"
  | "netProfitRatio"
  | "comprehensiveIncome"
  | "liabilities"
  | "currentLiabilities"
  | "currentAssets"
  | "netAssets"
  | "totalAssets"
  | "investmentSecurities"
  | "cashBalance"
  | "operatingCF"
  | "investingCF"
  | "financingCF";

export type ColumnCategory = "basic" | "valuation" | "performance" | "balancesheet" | "cash";

const COLUMN_CONFIG: { id: ColumnId; label: string; category: ColumnCategory }[] = [
  { id: "filerName", label: "会社名*", category: "basic" },
  { id: "secCode", label: "銘柄コード*", category: "basic" },
  { id: "edinetCode", label: "EDINETコード", category: "basic" },
  { id: "calcDate", label: "計算日", category: "basic" },
  { id: "fiscalMonth", label: "決算月", category: "basic" },
  { id: "PBR", label: "PBR", category: "valuation" },
  { id: "PER", label: "PER", category: "valuation" },
  { id: "payoutRatio", label: "配当性向", category: "valuation" },
  { id: "dividendYield", label: "配当利回り", category: "valuation" },
  { id: "marketCap", label: "時価総額", category: "valuation" },
  { id: "netCash", label: "ネットキャッシュ", category: "valuation" },
  { id: "netCashRatio", label: "ネットキャッシュ比率", category: "valuation" },
  { id: "EPS", label: "EPS", category: "valuation" },
  { id: "ROE", label: "ROE", category: "valuation" },
  { id: "equityRatio", label: "自己資本比率", category: "valuation" },
  { id: "BPS", label: "BPS", category: "valuation" },
  { id: "dividendPerShare", label: "1株当たり配当金", category: "valuation" },
  { id: "sharesOutstanding", label: "発行済株式総数", category: "valuation" },
  { id: "sales", label: "売上高", category: "performance" },
  { id: "operatingProfit", label: "営業利益", category: "performance" },
  { id: "recurringProfit", label: "経常利益", category: "performance" },
  { id: "operatingProfitRatio", label: "営業利益率", category: "performance" },
  { id: "netIncome", label: "当期純利益", category: "performance" },
  { id: "netProfitRatio", label: "純利益率", category: "performance" },
  { id: "comprehensiveIncome", label: "包括利益", category: "performance" },
  { id: "liabilities", label: "負債", category: "balancesheet" },
  { id: "currentLiabilities", label: "流動負債", category: "balancesheet" },
  { id: "currentAssets", label: "流動資産", category: "balancesheet" },
  { id: "netAssets", label: "純資産額", category: "balancesheet" },
  { id: "totalAssets", label: "総資産額", category: "balancesheet" },
  { id: "investmentSecurities", label: "投資有価証券", category: "balancesheet" },
  { id: "cashBalance", label: "現金及び現金同等物", category: "cash" },
  { id: "operatingCF", label: "営業CF", category: "cash" },
  { id: "investingCF", label: "投資CF", category: "cash" },
  { id: "financingCF", label: "財務CF", category: "cash" },
];

const COLUMN_IDS = COLUMN_CONFIG.map((c) => c.id);

const CATEGORY_LABELS: Record<ColumnCategory, string> = {
  basic: "基本情報",
  valuation: "バリュエーション",
  performance: "業績・収益性",
  balancesheet: "バランスシート",
  cash: "キャッシュ関連",
};

const DEFAULT_VISIBLE: ColumnId[] = COLUMN_IDS;

const STORAGE_KEY = "edinet-screener-column-visibility";

const DEFAULT_VISIBILITY = COLUMN_IDS.reduce(
  (acc, id) => ({ ...acc, [id]: true }),
  {} as Record<ColumnId, boolean>
);

function loadVisibility(): Record<ColumnId, boolean> {
  if (typeof window === "undefined") return DEFAULT_VISIBILITY;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_VISIBILITY;
    const parsed = JSON.parse(stored) as Record<string, boolean>;
    return COLUMN_IDS.reduce((acc, id) => ({ ...acc, [id]: parsed[id] ?? true }), {} as Record<ColumnId, boolean>);
  } catch {
    return DEFAULT_VISIBILITY;
  }
}

function saveVisibility(vis: Record<ColumnId, boolean>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vis));
  } catch {
    /* ignore */
  }
}

type ColumnVisibilityContextValue = {
  visibility: Record<ColumnId, boolean>;
  setColumnVisible: (id: ColumnId, visible: boolean) => void;
  toggleColumn: (id: ColumnId) => void;
  showAll: () => void;
  hideAll: () => void;
  resetColumns: () => void;
  columnIds: readonly ColumnId[];
  columnConfig: readonly { id: ColumnId; label: string; category: ColumnCategory }[];
  columnLabel: (id: ColumnId) => string;
  getCategoryLabel: (cat: ColumnCategory) => string;
};

const ColumnVisibilityContext = createContext<ColumnVisibilityContextValue | null>(null);

export function ColumnVisibilityProvider({ children }: { children: ReactNode }) {
  const [visibility, setVisibility] = useState<Record<ColumnId, boolean>>(() => DEFAULT_VISIBILITY);

  useEffect(() => {
    setVisibility(loadVisibility());
  }, []);

  useEffect(() => {
    saveVisibility(visibility);
  }, [visibility]);

  const setColumnVisible = useCallback((id: ColumnId, visible: boolean) => {
    setVisibility((prev) => ({ ...prev, [id]: visible }));
  }, []);

  const toggleColumn = useCallback((id: ColumnId) => {
    setVisibility((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const showAll = useCallback(() => {
    setVisibility(COLUMN_IDS.reduce((acc, id) => ({ ...acc, [id]: true }), {} as Record<ColumnId, boolean>));
  }, []);

  const hideAll = useCallback(() => {
    setVisibility(COLUMN_IDS.reduce((acc, id) => ({ ...acc, [id]: false }), {} as Record<ColumnId, boolean>));
  }, []);

  const resetColumns = useCallback(() => {
    setVisibility(COLUMN_IDS.reduce((acc, id) => ({ ...acc, [id]: true }), {} as Record<ColumnId, boolean>));
  }, []);

  const columnLabel = useCallback(
    (id: ColumnId) => COLUMN_CONFIG.find((c) => c.id === id)?.label ?? id,
    []
  );

  const getCategoryLabel = useCallback((cat: ColumnCategory) => CATEGORY_LABELS[cat], []);

  return (
    <ColumnVisibilityContext.Provider
      value={{
        visibility,
        setColumnVisible,
        toggleColumn,
        showAll,
        hideAll,
        resetColumns,
        columnIds: COLUMN_IDS,
        columnConfig: COLUMN_CONFIG,
        columnLabel,
        getCategoryLabel,
      }}
    >
      {children}
    </ColumnVisibilityContext.Provider>
  );
}

export function useColumnVisibility() {
  const ctx = useContext(ColumnVisibilityContext);
  if (!ctx) throw new Error("useColumnVisibility must be used within ColumnVisibilityProvider");
  return ctx;
}

export { COLUMN_IDS, COLUMN_CONFIG, CATEGORY_LABELS };
