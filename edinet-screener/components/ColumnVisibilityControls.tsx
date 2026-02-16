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
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
          view_column
        </span>
        表示列
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[280px] max-h-[70vh] overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg p-4">
            <div className="space-y-3">
              {(["basic", "valuation", "performance", "balancesheet", "cash"] as const).map((cat) => {
                const cols = columnConfig.filter((c) => c.category === cat);
                if (cols.length === 0) return null;
                return (
                  <div key={cat}>
                    <div className="text-xs font-medium text-slate-500 mb-1">
                      {getCategoryLabel(cat)}
                    </div>
                    <div className="space-y-1 pl-1">
                      {cols.map((c) => (
                        <label key={c.id} className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
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
              <div className="flex gap-1 pt-2 flex-wrap border-t border-slate-200">
                <button type="button" onClick={showAll} className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900">
                  全表示
                </button>
                <button type="button" onClick={hideAll} className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900">
                  全非表示
                </button>
                <button type="button" onClick={resetColumns} className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900">
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
