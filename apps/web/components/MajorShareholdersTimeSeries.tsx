"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMajorShareholderCell } from "@/lib/parse-major-shareholders";
import { api } from "@/lib/api";
import type { ShareholdersResponse } from "@edinet/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Alert, AlertDescription } from "./ui/alert";
import { Skeleton } from "./ui/skeleton";
import { AlertCircle } from "lucide-react";

type PeriodData = {
  periodEnd: string;
  docID: string;
  byName: Map<string, { shares: string | null; ratio: string | null }>;
};

export function MajorShareholdersTimeSeries({
  secCode,
  visiblePeriodEnds,
  active,
}: {
  secCode: string;
  visiblePeriodEnds: string[];
  active: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allPeriods, setAllPeriods] = useState<PeriodData[]>([]);

  useEffect(() => {
    if (!active || !secCode) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await api.api.shareholders[":secCode"].$get({ param: { secCode } });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as ShareholdersResponse;
        if (!cancelled) {
          if (!data.snapshots.length) {
            setAllPeriods([]);
            setError(
              "大株主の明細が含まれる提出書類が見つかりませんでした（四半期報告書などでは記載がない場合があります）。",
            );
            return;
          }
          setAllPeriods(
            data.snapshots.map((p) => {
              const byName = new Map<string, { shares: string | null; ratio: string | null }>();
              for (const s of p.entries) {
                byName.set(s.name, {
                  shares: s.shares != null ? String(s.shares) : null,
                  ratio: s.ratio != null ? String(s.ratio) : null,
                });
              }
              return { periodEnd: p.periodEnd, docID: p.periodEnd, byName };
            }),
          );
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [active, secCode]);

  // 表示期間でフィルタ
  const parsed = useMemo(() => {
    if (!visiblePeriodEnds.length) return allPeriods;
    const set = new Set(visiblePeriodEnds);
    return allPeriods.filter((p) => set.has(p.periodEnd));
  }, [allPeriods, visiblePeriodEnds]);

  const rowNames = useMemo(() => {
    const set = new Set<string>();
    for (const col of parsed) {
      for (const name of col.byName.keys()) set.add(name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ja"));
  }, [parsed]);

  if (!active) return null;

  if (loading) {
    return (
      <div className="space-y-3 p-1">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error && rowNames.length === 0) {
    return (
      <Alert>
        <AlertCircle className="size-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!loading && rowNames.length === 0) {
    return (
      <Alert>
        <AlertCircle className="size-4" />
        <AlertDescription>大株主データがありません。</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="default" className="border-amber-200 bg-amber-50/80 dark:bg-amber-950/20">
          <AlertCircle className="size-4 text-amber-700 dark:text-amber-400" />
          <AlertDescription className="text-amber-900 dark:text-amber-100/90">{error}</AlertDescription>
        </Alert>
      )}
      <p className="text-muted-foreground text-xs">
        提出書類ごとの大株主トップ10を、株主名で突き合わせた時系列です。数値は原資料（千株・持株比率）に基づきます。
      </p>
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="sticky left-0 z-20 min-w-[200px] bg-background font-semibold">株主名</TableHead>
              {parsed.map((col) => (
                <TableHead
                  key={`${col.periodEnd}-${col.docID}`}
                  className="text-right font-semibold whitespace-nowrap min-w-[120px]"
                >
                  {col.periodEnd}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rowNames.map((name) => (
              <TableRow key={name}>
                <TableCell className="sticky left-0 z-10 max-w-[280px] bg-background font-medium align-top">
                  <span className="line-clamp-3" title={name}>{name}</span>
                </TableCell>
                {parsed.map((col) => {
                  const cell = col.byName.get(name);
                  return (
                    <TableCell
                      key={`${col.periodEnd}-${col.docID}`}
                      className="text-right tabular-nums align-top text-xs sm:text-sm"
                    >
                      {cell ? formatMajorShareholderCell(cell.shares, cell.ratio) : "―"}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
