import { Badge } from "../ui/badge";
import { GITHUB_REPO } from "../../lib/routes";

export function LandingQuickStart() {
  return (
    <section className="relative overflow-hidden border-t border-border bg-background px-4 py-20 sm:px-8 sm:py-24 lg:px-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: "radial-gradient(circle, var(--border) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="relative mx-auto max-w-4xl">
        <p className="text-[10.5px] font-semibold uppercase tracking-widest text-muted-foreground">クイックスタート</p>
        <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl">すぐに試せる</h2>
        <p className="mt-4 max-w-lg text-sm font-light leading-relaxed text-muted-foreground">
          Docker でサンプルデータ付きの環境を起動できます。
        </p>

        <div className="mt-10 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div className="flex h-9 items-center gap-1.5 border-b border-border bg-muted/80 px-4">
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
            <span className="ml-2 font-mono text-[10px] text-muted-foreground">terminal — docker compose up</span>
          </div>
          <div className="space-y-5 p-5 sm:p-6">
            <p className="text-sm text-muted-foreground">
              ランディングページは{" "}
              <code className="rounded-md border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                /
              </code>
              、スクリーナーは{" "}
              <code className="rounded-md border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
                /screener
              </code>
              です。
            </p>
            <pre className="overflow-x-auto rounded-lg border border-border/80 bg-muted/40 p-4 font-mono text-xs leading-relaxed text-foreground sm:text-sm">
              {`git clone ${GITHUB_REPO}.git
cd edinet-wagatoushi
docker compose up`}
            </pre>
            <p className="text-sm text-muted-foreground">
              <a
                href="http://localhost:3000"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                http://localhost:3000
              </a>{" "}
              で LP、
              <a
                href="http://localhost:3000/screener"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                /screener
              </a>{" "}
              でスクリーナーが開きます。
            </p>
            <div className="flex flex-wrap gap-2 border-t border-border/60 pt-5">
              <Badge variant="outline">LP = /</Badge>
              <Badge variant="outline">App = /screener</Badge>
              <Badge variant="outline">MIT License</Badge>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
