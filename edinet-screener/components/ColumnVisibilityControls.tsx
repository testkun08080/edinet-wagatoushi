"use client";

import { useColumnVisibility } from "./ColumnVisibilityContext.js";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Columns3 } from "lucide-react";

export function ColumnVisibilityControls() {
  const { visibility, toggleColumn, showAll, hideAll, resetColumns, columnConfig, getCategoryLabel } =
    useColumnVisibility();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Columns3 className="size-4" />
          <span className="hidden sm:inline">表示列</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 max-h-[70vh] overflow-y-auto">
        {(["basic", "valuation", "performance", "balancesheet", "cash", "growth"] as const).map((cat, catIdx) => {
          const cols = columnConfig.filter((c) => c.category === cat);
          if (cols.length === 0) return null;
          return (
            <div key={cat}>
              {catIdx > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="text-xs">{getCategoryLabel(cat)}</DropdownMenuLabel>
              {cols.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.id}
                  checked={!!visibility[c.id]}
                  onCheckedChange={() => toggleColumn(c.id)}
                  onSelect={(e: Event) => e.preventDefault()}
                >
                  {c.label}
                </DropdownMenuCheckboxItem>
              ))}
            </div>
          );
        })}
        <DropdownMenuSeparator />
        <div className="flex gap-1 px-2 py-1.5">
          <Button variant="ghost" size="xs" onClick={showAll}>
            全表示
          </Button>
          <Button variant="ghost" size="xs" onClick={hideAll}>
            全非表示
          </Button>
          <Button variant="ghost" size="xs" onClick={resetColumns}>
            リセット
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
