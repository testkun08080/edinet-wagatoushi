import type { ColumnDefinition } from "@edinet/types";
import screenerColumnsJson from "./screener_columns.json";

type ScreenerColumn = {
  id: string;
  label: string;
  category: string;
  metricsKey?: string;
  computed?: boolean;
  computedFrom?: string[];
};

export function getScreenerColumns(): ColumnDefinition[] {
  const raw = screenerColumnsJson as { columns: ScreenerColumn[] };
  return raw.columns.map((col) => ({
    key: col.id,
    label: col.label,
    group: col.category,
    defaultVisible:
      col.id === "filerName" || col.id === "secCode" || col.id === "sales" || col.id === "ROE",
  }));
}
