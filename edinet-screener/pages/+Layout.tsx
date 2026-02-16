import "./Layout.css";
import "./tailwind.css";
import { CompanySidebar } from "../components/CompanySidebar";
import { FilterProvider } from "../components/FilterContext";
import { ColumnVisibilityProvider } from "../components/ColumnVisibilityContext";
import { FavoritesProvider } from "../components/FavoritesContext";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <FilterProvider>
      <FavoritesProvider>
        <ColumnVisibilityProvider>
          <div className="flex h-screen overflow-hidden">
            <CompanySidebar />
            <main id="page-container" className="flex flex-col flex-1 min-w-0 overflow-hidden">
              <div id="page-content" className="flex flex-col flex-1 min-h-0 overflow-hidden p-6 pb-12 max-w-[1400px]">
                {children}
              </div>
            </main>
          </div>
        </ColumnVisibilityProvider>
      </FavoritesProvider>
    </FilterProvider>
  );
}
