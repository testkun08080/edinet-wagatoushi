"use client";

import "./Layout.css";
import "./tailwind.css";
import { useEffect } from "react";
import { AppSidebar } from "../components/CompanySidebar";
import { FilterProvider } from "../components/FilterContext";
import { ColumnVisibilityProvider } from "../components/ColumnVisibilityContext";
import { FavoritesProvider } from "../components/FavoritesContext";
import { RecentCompaniesProvider } from "../components/RecentCompaniesContext";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "../components/ui/sidebar";
import { TooltipProvider } from "../components/ui/tooltip";
import { Separator } from "../components/ui/separator";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbPage } from "../components/ui/breadcrumb";
import { usePageContext } from "vike-react/usePageContext";
import { initializeGA, trackPageView } from "../lib/analytics";
import { DarkModeToggle } from "../components/DarkModeToggle";
import { SCREENER } from "../lib/routes";

function useSidebarShell(urlPathname: string): boolean {
  if (urlPathname === "/") return false;
  return (
    urlPathname === SCREENER ||
    urlPathname.startsWith(`${SCREENER}/`) ||
    urlPathname === "/privacy" ||
    urlPathname === "/contact" ||
    urlPathname.startsWith("/analyze/")
  );
}

function AppHeader() {
  const pageContext = usePageContext();
  const urlPathname = pageContext?.urlPathname ?? "/";

  useEffect(() => {
    trackPageView(urlPathname);
  }, [urlPathname]);

  const isAnalyzePage = urlPathname.startsWith(`${SCREENER}/analyze/`) || urlPathname.startsWith("/analyze/");
  const secCode = isAnalyzePage
    ? urlPathname.startsWith(`${SCREENER}/analyze/`)
      ? urlPathname.split("/")[3]
      : urlPathname.split("/")[2]
    : null;

  const crumb =
    urlPathname === "/privacy"
      ? "プライバシーポリシー"
      : urlPathname === "/contact"
        ? "お問い合わせ"
        : isAnalyzePage
          ? `企業分析 (${secCode})`
          : "企業一覧";

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 !h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="text-sm font-medium">{crumb}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <DarkModeToggle />
    </header>
  );
}

function LandingLayout({ children }: { children: React.ReactNode }) {
  const pageContext = usePageContext();
  const urlPathname = pageContext?.urlPathname ?? "/";

  useEffect(() => {
    trackPageView(urlPathname);
  }, [urlPathname]);

  return <>{children}</>;
}

function ScreenerShell({ children }: { children: React.ReactNode }) {
  return (
    <FilterProvider>
      <FavoritesProvider>
        <RecentCompaniesProvider>
          <ColumnVisibilityProvider>
            <TooltipProvider>
              <SidebarProvider className="min-h-svh">
                <AppSidebar />
                <SidebarInset className="min-h-svh min-w-0 overflow-hidden">
                  <AppHeader />
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
                </SidebarInset>
              </SidebarProvider>
            </TooltipProvider>
          </ColumnVisibilityProvider>
        </RecentCompaniesProvider>
      </FavoritesProvider>
    </FilterProvider>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const pageContext = usePageContext();
  const urlPathname = pageContext?.urlPathname ?? "/";
  const sidebarShell = useSidebarShell(urlPathname);

  useEffect(() => {
    initializeGA();
  }, []);

  if (!sidebarShell) {
    return <LandingLayout>{children}</LandingLayout>;
  }

  return <ScreenerShell>{children}</ScreenerShell>;
}
