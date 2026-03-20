"use client";

import { useEffect, useMemo, useState } from "react";
import { parseMajorShareholdersFromRaw, formatMajorShareholderCell } from "@/lib/parse-major-shareholders";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Alert, AlertDescription } from "./ui/alert";
import { Skeleton } from "./ui/skeleton";
import { AlertCircle } from "lucide-react";

export type PeriodWithRaw = {
  periodEnd: string;
  rawTsvPath?: string;
};

type PeriodParsed = {
  periodEnd: string;
  byName: Map<string, { shares: string | null; ratio: string | null }>;
};

export function MajorShareholdersTimeSeries({ periods, active }: { periods: PeriodWithRaw[]; active: boolean }) {
  const safePeriods = periods ?? [];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<PeriodParsed[]>([]);

  const periodsWithPath = useMemo(() => safePeriods.filter((p) => p.rawTsvPath?.trim()), [safePeriods]);

  useEffect(() => {
    if (periodsWithPath.length === 0) {
      setParsed([]);
      setError(null);
      setLoading(false);
      return;
    }
    if (!active) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const results = await Promise.all(
          periodsWithPath.map(async (p) => {
            const path = p.rawTsvPath!.trim();
            const url = `/data/${path}`;
            try {
              const res = await fetch(url);
              if (!res.ok) {
                return {
                  periodEnd: p.periodEnd,
                  byName: new Map<string, { shares: string | null; ratio: string | null }>(),
                  failed: true as const,
                };
              }
              const raw = (await res.json()) as { rows?: string[][] };
              const list = parseMajorShareholdersFromRaw(raw);
              const byName = new Map<string, { shares: string | null; ratio: string | null }>();
              for (const e of list) {
                byName.set(e.name, { shares: e.shares, ratio: e.ratio });
              }
              return { periodEnd: p.periodEnd, byName, failed: false as const };
            } catch {
              return {
                periodEnd: p.periodEnd,
                byName: new Map<string, { shares: string | null; ratio: string | null }>(),
                failed: true as const,
              };
            }
          }),
        );

        if (cancelled) return;

        setParsed(results.map(({ periodEnd, byName }) => ({ periodEnd, byName })));

        const anyData = results.some((r) => r.byName.size > 0);
        if (!anyData) {
          setError(
            "大株主の明細が含まれる提出書類が見つかりませんでした（四半期報告書などでは記載がない場合があります）。",
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

    return () => {
      cancelled = true;
    };
  }, [active, periodsWithPath]);

  const rowNames = useMemo(() => {
    const set = new Set<string>();
    for (const col of parsed) {
      for (const name of col.byName.keys()) {
        set.add(name);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ja"));
  }, [parsed]);

  if (!periodsWithPath.length) {
    return (
      <Alert>
        <AlertCircle className="size-4" />
        <AlertDescription>
          この企業の開示データに大株主抽出用の生データパス（rawTsvPath）が含まれていません。
        </AlertDescription>
      </Alert>
    );
  }

  if (!active) {
    return null;
  }

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
                <TableHead key={col.periodEnd} className="text-right font-semibold whitespace-nowrap min-w-[120px]">
                  {col.periodEnd}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rowNames.map((name) => (
              <TableRow key={name}>
                <TableCell className="sticky left-0 z-10 max-w-[280px] bg-background font-medium align-top">
                  <span className="line-clamp-3" title={name}>
                    {name}
                  </span>
                </TableCell>
                {parsed.map((col) => {
                  const cell = col.byName.get(name);
                  return (
                    <TableCell key={col.periodEnd} className="text-right tabular-nums align-top text-xs sm:text-sm">
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
