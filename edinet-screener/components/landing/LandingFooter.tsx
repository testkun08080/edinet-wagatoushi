import logoUrl from "../../assets/logo.png";
import { SITE_NAME } from "../../lib/brand";
import { GITHUB_REPO } from "../../lib/routes";

export function LandingFooter() {
  return (
    <footer className="border-t border-white/6 bg-foreground px-4 py-7 text-background sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <img src={logoUrl} alt="" className="size-[18px] opacity-40 brightness-0 invert" />
          <span className="text-xs font-semibold text-white/30">{SITE_NAME}</span>
        </div>
        <div className="flex flex-wrap justify-center gap-6">
          <a href="/privacy" className="text-xs text-white/27 transition-colors hover:text-white/60">
            プライバシーポリシー
          </a>
          <a href="/contact" className="text-xs text-white/27 transition-colors hover:text-white/60">
            お問い合わせ
          </a>
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/27 transition-colors hover:text-white/60"
          >
            GitHub
          </a>
        </div>
        <p className="text-[11px] text-white/18">
          © {new Date().getFullYear()} {SITE_NAME} · MIT License
        </p>
      </div>
    </footer>
  );
}
