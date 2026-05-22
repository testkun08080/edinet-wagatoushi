import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { GITHUB_DOCS, GITHUB_REPO, SCREENER } from "../../lib/routes";
import { ArrowRight, Github } from "lucide-react";

const OSS_STATS = [
  { value: "MIT", label: "ライセンス" },
  { value: "10年", label: "財務データ" },
  { value: "TypeScript", label: "フロントエンド" },
  { value: "週次", label: "データ更新" },
] as const;

export function LandingOpenSource() {
  return (
    <section id="opensource" className="scroll-mt-16 bg-foreground text-background">
      <div className="px-4 py-20 text-center sm:px-8 sm:py-24 lg:px-12">
        <div className="mx-auto max-w-2xl">
          <Badge
            variant="outline"
            className="mb-6 border-white/10 bg-transparent px-3.5 py-1 text-[10px] uppercase tracking-widest text-white/40"
          >
            MIT License
          </Badge>
          <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            誰でも無料で使える、
            <br />
            <span className="font-light text-white/55">完全オープンソース</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-sm font-light leading-relaxed text-white/45 sm:text-base">
            ソースコードは GitHub で公開中。Cloudflare Workers を使って自分のアカウントにデプロイして、
            プライベートな環境でご利用いただけます。貢献も歓迎しています。
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" className="bg-background text-foreground shadow-sm hover:bg-background/90" asChild>
              <a href={SCREENER}>
                スクリーナーを開く
                <ArrowRight className="size-4" />
              </a>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="border border-white/30 bg-white/12 text-white hover:bg-white/20 hover:text-white dark:border-white/30 dark:bg-white/12 dark:text-white dark:hover:bg-white/20"
              asChild
            >
              <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer">
                <Github className="size-4" />
                GitHub で見る
              </a>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="border border-white/30 bg-white/12 text-white hover:bg-white/20 hover:text-white dark:border-white/30 dark:bg-white/12 dark:text-white dark:hover:bg-white/20"
              asChild
            >
              <a href={GITHUB_DOCS} target="_blank" rel="noopener noreferrer">
                デプロイガイド
                <ArrowRight className="size-4" />
              </a>
            </Button>
          </div>

          <div className="mt-16 flex flex-wrap justify-center gap-8 border-t border-white/7 pt-12 sm:gap-12">
            {OSS_STATS.map(({ value, label }) => (
              <div key={label} className="min-w-[100px]">
                <div className="font-mono text-2xl font-bold tracking-tight">{value}</div>
                <div className="mt-1 text-[10.5px] text-white/35">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
