"use client";

import { useState } from "react";
import { useColumnVisibility } from "./ColumnVisibilityContext.js";

export function ColumnVisibilityControls() {
  const { visibility, toggleColumn, showAll, hideAll, resetColumns, columnConfig, getCategoryLabel } =
    useColumnVisibility();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="btn btn-sm btn-ghost gap-1"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span>📋</span> 表示列
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[280px] max-h-[70vh] overflow-y-auto bg-base-100 border border-base-300 rounded-lg shadow-lg p-4">
            <div className="space-y-3">
              {(["basic", "valuation", "performance", "balancesheet", "cash"] as const).map((cat) => {
                const cols = columnConfig.filter((c) => c.category === cat);
                if (cols.length === 0) return null;
                return (
                  <div key={cat}>
                    <div className="text-xs font-medium text-base-content/60 mb-1">
                      {getCategoryLabel(cat)}
                    </div>
                    <div className="space-y-1 pl-1">
                      {cols.map((c) => (
                        <label key={c.id} className="flex items-center gap-2 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-sm"
                            checked={!!visibility[c.id]}
                            onChange={() => toggleColumn(c.id)}
                          />
                          <span className="truncate">{c.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="flex gap-1 pt-2 flex-wrap border-t border-base-300">
                <button type="button" onClick={showAll} className="btn btn-xs btn-ghost">
                  全表示
                </button>
                <button type="button" onClick={hideAll} className="btn btn-xs btn-ghost">
                  全非表示
                </button>
                <button type="button" onClick={resetColumns} className="btn btn-xs btn-ghost">
                  リセット
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
