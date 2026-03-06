"use client";

import "./Layout.css";
import "./tailwind.css";
import { CompanySidebar, useNarrowViewport } from "../components/CompanySidebar";
import { FilterProvider } from "../components/FilterContext";
import { ColumnVisibilityProvider } from "../components/ColumnVisibilityContext";
import { FavoritesProvider } from "../components/FavoritesContext";
import { RecentCompaniesProvider } from "../components/RecentCompaniesContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  const isNarrow = useNarrowViewport();
  return (
    <FilterProvider>
      <FavoritesProvider>
        <RecentCompaniesProvider>
          <ColumnVisibilityProvider>
            <div
              className={`flex h-screen overflow-hidden bg-slate-50 ${isNarrow ? "narrow-viewport" : ""}`}
            >
              <CompanySidebar />
              <main id="page-container" className="flex flex-col flex-1 min-w-0 overflow-hidden bg-white">
                <div id="page-content" className="flex flex-col flex-1 min-h-0 overflow-hidden">
                  {children}
                </div>
              </main>
            </div>
          </ColumnVisibilityProvider>
        </RecentCompaniesProvider>
      </FavoritesProvider>
    </FilterProvider>
  );
}
