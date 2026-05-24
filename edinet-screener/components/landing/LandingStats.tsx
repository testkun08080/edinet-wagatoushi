"use client";

import { useCountUp } from "../../lib/landing/use-count-up";

function StatItem({ target, suffix, label }: { target: number; suffix: string; label: string }) {
  const [val, ref] = useCountUp(target);

  return (
    <div ref={ref} className="flex-1 border-r border-white/6 px-5 py-9 text-center last:border-r-0">
      <div className="font-mono text-3xl font-bold tracking-tight text-white sm:text-4xl">
        {val.toLocaleString()}
        <span className="font-light text-white/45">{suffix}</span>
      </div>
      <div className="mt-2 text-[11px] text-white/38">{label}</div>
    </div>
  );
}

export function LandingStats() {
  return (
    <div className="bg-foreground">
      <div className="mx-auto flex max-w-4xl flex-col sm:flex-row">
        <StatItem target={4200} suffix="+" label="上場企業データ" />
        <StatItem target={10} suffix="年+" label="四半期財務データ" />
        <StatItem target={20} suffix="+" label="スクリーニング指標" />
        <StatItem target={0} suffix="円" label="無料・MIT License" />
      </div>
    </div>
  );
}
