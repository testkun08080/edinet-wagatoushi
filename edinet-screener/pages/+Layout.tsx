"use client";

import "./Layout.css";
import "./tailwind.css";
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

function formatDisplayName(name: string): string {
  return name.replace(/^株式会社\s*|\s*株式会社$/g, "").trim() || name;
}

function AppHeader() {
  const pageContext = usePageContext();
  const urlPathname = pageContext?.urlPathname ?? "/";
  const isAnalyzePage = urlPathname.startsWith("/analyze/");
  const secCode = isAnalyzePage ? urlPathname.split("/")[2] : null;

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 !h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="text-sm font-medium">
                {isAnalyzePage ? `企業分析 (${secCode})` : "企業一覧"}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <FilterProvider>
      <FavoritesProvider>
        <RecentCompaniesProvider>
          <ColumnVisibilityProvider>
            <TooltipProvider>
              <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                  <AppHeader />
                  <div className="flex flex-1 flex-col overflow-hidden">
                    {children}
                  </div>
                </SidebarInset>
              </SidebarProvider>
            </TooltipProvider>
          </ColumnVisibilityProvider>
        </RecentCompaniesProvider>
      </FavoritesProvider>
    </FilterProvider>
  );
}
