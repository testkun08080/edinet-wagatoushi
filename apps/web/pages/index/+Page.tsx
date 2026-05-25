"use client";

import { LandingNav } from "../../components/landing/LandingNav";
import { LandingHero } from "../../components/landing/LandingHero";
import { LandingStats } from "../../components/landing/LandingStats";
import { LandingFeatures } from "../../components/landing/LandingFeatures";
import { LandingQuickStart } from "../../components/landing/LandingQuickStart";
import { LandingOpenSource } from "../../components/landing/LandingOpenSource";
import { LandingFooter } from "../../components/landing/LandingFooter";

export default function Page() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <LandingNav />
      <main>
        <LandingHero />
        <LandingStats />
        <LandingFeatures />
        <LandingQuickStart />
        <LandingOpenSource />
      </main>
      <LandingFooter />
    </div>
  );
}
