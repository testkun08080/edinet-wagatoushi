import { LANDING_FEATURES } from "../../lib/landing/demo-data";

export function LandingFeatures() {
  return (
    <section id="features" className="scroll-mt-16 bg-card px-4 py-20 sm:px-8 sm:py-24 lg:px-12">
      <div className="mx-auto max-w-4xl">
        <p className="text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground">機能</p>
        <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          スクリーニングから
          <br />
          深掘り分析まで
        </h2>
        <p className="mt-4 max-w-lg text-sm font-light leading-relaxed text-muted-foreground sm:text-base">
          EDINETの開示データを活用した、個人投資家向けの本格的な財務分析ツール。
        </p>

        <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {LANDING_FEATURES.map((f) => (
            <div key={f.n} className="bg-card p-7 transition-colors hover:bg-muted/40 sm:p-8">
              <div className="mb-4 font-mono text-[10px] tracking-wider text-muted-foreground">{f.n}</div>
              <h3 className="text-sm font-bold leading-snug tracking-tight">{f.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-[13px]">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
