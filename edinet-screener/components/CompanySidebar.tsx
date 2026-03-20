"use client";

import { useState, useEffect } from "react";
import { usePageContext } from "vike-react/usePageContext";
import { useFilters } from "./FilterContext.js";
import { useFavorites } from "./FavoritesContext.js";
import { useRecentCompanies } from "./RecentCompaniesContext.js";
import logoUrl from "../assets/logo.svg";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarRail,
} from "./ui/sidebar";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Search, Star, Clock, Home, BarChart3, SlidersHorizontal, Trash2 } from "lucide-react";

type CompanyItem = { secCode: string; filerName: string };

function formatDisplayName(name: string): string {
  return name.replace(/^株式会社\s*|\s*株式会社$/g, "").trim() || name;
}

export function AppSidebar() {
  const pageContext = usePageContext();
  const urlPathname = pageContext?.urlPathname ?? "/";
  const { filters, setFilter, clearFilters } = useFilters();
  const { favorites } = useFavorites();
  const { recent } = useRecentCompanies();
  const [companyList, setCompanyList] = useState<CompanyItem[]>([]);
  const [analyzeSearchQuery, setAnalyzeSearchQuery] = useState("");

  const isAnalyzePage = urlPathname.startsWith("/analyze/");

  useEffect(() => {
    if (!isAnalyzePage) return;
    fetch("/data/company_metrics.json")
      .then((res) => res.json())
      .then((data) => {
        const d = data as { metrics?: Array<{ secCode: string; filerName: string }> };
        const list = (d.metrics ?? []).map((m) => ({
          secCode: m.secCode,
          filerName: m.filerName,
        }));
        setCompanyList(list);
      })
      .catch(() => setCompanyList([]));
  }, [isAnalyzePage]);

  const analyzeSearchResults = analyzeSearchQuery.trim()
    ? companyList
        .filter(
          (c) =>
            c.filerName.toLowerCase().includes(analyzeSearchQuery.trim().toLowerCase()) ||
            c.secCode.includes(analyzeSearchQuery.trim()),
        )
        .slice(0, 15)
    : [];

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <img src={logoUrl} height={20} width={20} alt="" className="shrink-0" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold">エディー</span>
                  <span className="truncate text-xs text-muted-foreground">EDINET スクリーナー</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>ナビゲーション</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={urlPathname === "/"} tooltip="企業一覧">
                  <a href="/">
                    <Home className="size-4" />
                    <span>企業一覧</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {isAnalyzePage && (
          <>
            {/* Analyze page: Search */}
            <SidebarGroup>
              <SidebarGroupLabel>
                <Search className="mr-1.5 size-3.5" />
                企業検索
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-2">
                  <Input
                    placeholder="会社名・銘柄コードで検索"
                    value={analyzeSearchQuery}
                    onChange={(e) => setAnalyzeSearchQuery(e.target.value)}
                    className="h-8"
                  />
                </div>
                {analyzeSearchResults.length > 0 && (
                  <ScrollArea className="max-h-48 mt-1">
                    <SidebarMenu>
                      {analyzeSearchResults.map((c) => (
                        <SidebarMenuItem key={c.secCode}>
                          <SidebarMenuButton asChild size="sm">
                            <a href={`/analyze/${c.secCode}`}>
                              <BarChart3 className="size-3.5" />
                              <span className="truncate">{formatDisplayName(c.filerName)}</span>
                              <Badge variant="outline" className="ml-auto text-[10px]">
                                {c.secCode}
                              </Badge>
                            </a>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </ScrollArea>
                )}
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator />

            {/* Favorites */}
            <SidebarGroup>
              <SidebarGroupLabel>
                <Star className="mr-1.5 size-3.5" />
                お気に入り
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {Array.from(favorites).length === 0 ? (
                    <SidebarMenuItem>
                      <SidebarMenuButton disabled>
                        <span className="text-muted-foreground text-xs">お気に入りがありません</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ) : (
                    <>
                      {companyList
                        .filter((c) => favorites.has(c.secCode))
                        .map((c) => (
                          <SidebarMenuItem key={c.secCode}>
                            <SidebarMenuButton asChild size="sm">
                              <a href={`/analyze/${c.secCode}`}>
                                <Star className="size-3.5 fill-yellow-400 text-yellow-400" />
                                <span className="truncate">{formatDisplayName(c.filerName)}</span>
                              </a>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      {Array.from(favorites)
                        .filter((s) => !companyList.find((c) => c.secCode === s))
                        .map((secCode) => (
                          <SidebarMenuItem key={secCode}>
                            <SidebarMenuButton asChild size="sm">
                              <a href={`/analyze/${secCode}`}>
                                <Star className="size-3.5 fill-yellow-400 text-yellow-400" />
                                <span>{secCode}</span>
                              </a>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                    </>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator />

            {/* Recent */}
            <SidebarGroup>
              <SidebarGroupLabel>
                <Clock className="mr-1.5 size-3.5" />
                履歴
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {recent.length === 0 ? (
                    <SidebarMenuItem>
                      <SidebarMenuButton disabled>
                        <span className="text-muted-foreground text-xs">履歴がありません</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ) : (
                    recent.map((c) => (
                      <SidebarMenuItem key={c.secCode}>
                        <SidebarMenuButton asChild size="sm">
                          <a href={`/analyze/${c.secCode}`}>
                            <Clock className="size-3.5" />
                            <span className="truncate">{formatDisplayName(c.filerName)}</span>
                            <Badge variant="outline" className="ml-auto text-[10px]">
                              {c.secCode}
                            </Badge>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {!isAnalyzePage && (
          <>
            {/* Search filters for company list page */}
            <SidebarGroup>
              <SidebarGroupLabel>
                <Search className="mr-1.5 size-3.5" />
                検索
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="space-y-2 px-2">
                  <Input
                    placeholder="会社名"
                    value={filters.searchName}
                    onChange={(e) => setFilter("searchName", e.target.value)}
                    className="h-8"
                  />
                  <Input
                    placeholder="銘柄コード（例: 13760）"
                    value={filters.searchCode}
                    onChange={(e) => setFilter("searchCode", e.target.value)}
                    className="h-8"
                  />
                </div>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarSeparator />

            {/* Filters */}
            <SidebarGroup>
              <SidebarGroupLabel>
                <SlidersHorizontal className="mr-1.5 size-3.5" />
                基本フィルター
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="space-y-3 px-2">
                  {[
                    { key: "minEquityRatio" as const, label: "自己資本比率（最小）", step: "0.01", placeholder: "0.3" },
                    { key: "maxEquityRatio" as const, label: "自己資本比率（最大）", step: "0.01", placeholder: "1.0" },
                    { key: "minEps" as const, label: "EPS（最小）", step: "0.1", placeholder: "0" },
                    { key: "maxEps" as const, label: "EPS（最大）", step: "0.1", placeholder: "制限なし" },
                    { key: "minSales" as const, label: "売上高（百万円・最小）", step: "1000", placeholder: "0" },
                    {
                      key: "maxSales" as const,
                      label: "売上高（百万円・最大）",
                      step: "1000",
                      placeholder: "制限なし",
                    },
                    { key: "minRoe" as const, label: "ROE（最小・0.1=10%）", step: "0.01", placeholder: "0" },
                    { key: "maxRoe" as const, label: "ROE（最大）", step: "0.01", placeholder: "制限なし" },
                    {
                      key: "minTotalAssets" as const,
                      label: "総資産額（百万円・最小）",
                      step: "10000",
                      placeholder: "0",
                    },
                    {
                      key: "maxTotalAssets" as const,
                      label: "総資産額（百万円・最大）",
                      step: "10000",
                      placeholder: "制限なし",
                    },
                  ].map(({ key, label, step, placeholder }) => (
                    <div key={key}>
                      <label className="text-[11px] font-medium text-muted-foreground mb-1 block">{label}</label>
                      <Input
                        type="number"
                        step={step}
                        placeholder={placeholder}
                        className="h-7 text-xs"
                        value={(filters as unknown as Record<string, string>)[key]}
                        onChange={(e) => setFilter(key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {!isAnalyzePage && (
        <SidebarFooter>
          <Button variant="outline" size="sm" onClick={clearFilters} className="w-full">
            <Trash2 className="size-3.5 mr-1.5" />
            フィルターをクリア
          </Button>
        </SidebarFooter>
      )}
      <SidebarRail />
    </Sidebar>
  );
}
