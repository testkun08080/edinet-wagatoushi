"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import logoUrl from "../../assets/logo.png";
import { SITE_NAME } from "../../lib/brand";
import { GITHUB_REPO, GITHUB_DOCS, SCREENER } from "../../lib/routes";
import { Button } from "../ui/button";
import { DarkModeToggle } from "../DarkModeToggle";
import { Github, ExternalLink } from "lucide-react";

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 72);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between px-4 transition-all duration-300 sm:px-8 lg:px-12",
        scrolled ? "border-b border-border/60 bg-background/90 shadow-sm backdrop-blur-md" : "bg-transparent",
      )}
    >
      <a href="#" className="flex items-center gap-2.5">
        <img
          src={logoUrl}
          alt=""
          className={cn("size-7 rounded-md object-contain transition-[filter]", !scrolled && "brightness-0 invert")}
        />
        <span
          className={cn(
            "text-sm font-bold tracking-tight transition-colors",
            scrolled ? "text-foreground" : "text-white",
          )}
        >
          {SITE_NAME}
        </span>
      </a>

      <div className="flex items-center gap-4 sm:gap-8">
        <div className="hidden items-center gap-6 sm:flex">
          {[
            { href: "#features", label: "機能" },
            { href: SCREENER, label: "スクリーナー" },
            { href: "#opensource", label: "オープンソース" },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className={cn(
                "text-sm font-medium transition-opacity hover:opacity-70",
                scrolled ? "text-muted-foreground" : "text-white/70",
              )}
            >
              {label}
            </a>
          ))}
        </div>
        <a
          href={GITHUB_DOCS}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "hidden text-sm font-medium transition-opacity hover:opacity-70 md:inline",
            scrolled ? "text-muted-foreground" : "text-white/70",
          )}
        >
          Docs
        </a>
        <DarkModeToggle />
        <Button
          size="sm"
          variant={scrolled ? "default" : "secondary"}
          className={cn(!scrolled && "border border-white/20 bg-white/10 text-white hover:bg-white/15")}
          asChild
        >
          <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer">
            <Github className="size-3.5" />
            GitHub
            <ExternalLink className="size-3 opacity-60" />
          </a>
        </Button>
      </div>
    </nav>
  );
}
