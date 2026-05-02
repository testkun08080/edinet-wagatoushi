"use client";

import { useFilters } from "./FilterContext";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Zap } from "lucide-react";

type Preset = {
  name: string;
  description: string;
  filters: Record<string, string | boolean>;
};

const PRESETS: Preset[] = [
  {
    name: "ROE が高い",
    description: "自己資本利益率 15% 以上",
    filters: {
      minRoe: "15",
      minEquityRatio: "40",
    },
  },
  {
    name: "堅実な企業",
    description: "ROE 10% + 自己資本比率 50%",
    filters: {
      minRoe: "10",
      minEquityRatio: "50",
    },
  },
  {
    name: "成長中",
    description: "売上が多い企業",
    filters: {
      minSales: "50000",
    },
  },
  {
    name: "すべてリセット",
    description: "フィルタをクリア",
    filters: {},
  },
];

export function PresetScreeners() {
  const { setFilter, clearFilters } = useFilters();

  const handlePresetSelect = (preset: Preset) => {
    if (Object.keys(preset.filters).length === 0) {
      clearFilters();
    } else {
      // まずクリア
      clearFilters();
      // 次にプリセットのフィルタを適用
      Object.entries(preset.filters).forEach(([key, value]) => {
        setFilter(key as any, value);
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Zap className="size-4" />
          <span className="hidden sm:inline">プリセット</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {PRESETS.map((preset) => (
          <DropdownMenuItem
            key={preset.name}
            onSelect={() => handlePresetSelect(preset)}
            className="flex flex-col gap-1 py-2 px-3 cursor-pointer"
          >
            <div className="font-medium text-sm">{preset.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{preset.description}</div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
