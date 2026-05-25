"use client";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { SITE_TAGLINE } from "../../lib/brand";
import { GITHUB_REPO, SCREENER } from "../../lib/routes";
import { ArrowRight, Github } from "lucide-react";

export function LandingHero() {
  return (
    <section className="relative min-h-svh overflow-hidden bg-foreground text-background">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="pointer-events-none absolute -top-[10%] left-1/2 h-[400px] w-[700px] -translate-x-1/2 bg-[radial-gradient(ellipse,rgba(255,255,255,0.06)_0%,transparent_70%)]" />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-4 pb-0 pt-28 text-center sm:px-8 sm:pt-32">
        <Badge
          variant="outline"
          className="mb-7 border-white/20 bg-transparent px-3.5 py-1 text-[10px] font-medium uppercase tracking-widest text-white/55"
        >
          <span className="mr-1.5 inline-block size-1.5 rounded-full bg-white/50" />
          MIT License · オープンソース
        </Badge>

        <h1 className="animate-in fade-in slide-in-from-bottom-4 duration-700 text-balance text-4xl font-bold leading-[1.18] tracking-tight sm:text-5xl lg:text-6xl">
          EDINETデータで、
          <br />
          <span className="font-light text-white/90">日本株を深く読む</span>
        </h1>

        <p className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150 mx-auto mt-5 max-w-lg text-base font-light leading-relaxed text-white/55 sm:text-lg">
          金融庁の EDINET に開示された財務データを自動収集・構造化。 スクリーニング・企業分析・比較を、誰でも無料で。
        </p>
        <p className="mt-2 text-xs text-white/35">{SITE_TAGLINE}</p>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" className="bg-background text-foreground hover:bg-background/90" asChild>
            <a href={SCREENER}>
              スクリーナーを開く
              <ArrowRight className="size-4" />
            </a>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-white/20 bg-white/8 text-white hover:bg-white/12 hover:text-white"
            asChild
          >
            <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer">
              <Github className="size-4" />
              GitHub
            </a>
          </Button>
        </div>

        <div className="animate-in fade-in zoom-in-95 duration-1000 delay-500 mt-16 w-full max-w-4xl">
          <div
            className="overflow-hidden rounded-t-xl border border-white/10 shadow-2xl"
            style={{
              transform: "perspective(1600px) rotateX(5deg)",
              transformOrigin: "top center",
            }}
          >
            <div className="flex h-8 items-center gap-1.5 bg-muted px-3">
              <span className="size-2.5 rounded-full bg-[#ff5f57]" />
              <span className="size-2.5 rounded-full bg-[#febc2e]" />
              <span className="size-2.5 rounded-full bg-[#28c840]" />
              <span className="mx-2 flex-1 rounded bg-background/70 px-2 py-0.5 font-mono text-[9px] text-muted-foreground">
                edinet-screener/analyze/7974
              </span>
            </div>
            <img
              src="/landing/hero-screenshot.png"
              alt="エディスク 企業分析画面のスクリーンショット"
              className="block w-full bg-card"
              width={1720}
              height={900}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
