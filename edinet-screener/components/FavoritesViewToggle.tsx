"use client";

import { useFilters } from "./FilterContext.js";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";
import { List, Star } from "lucide-react";

export function FavoritesViewToggle() {
  const { filters, setFilter } = useFilters();

  return (
    <ToggleGroup
      type="single"
      value={filters.showOnlyFavorites ? "favorites" : "all"}
      onValueChange={(value: string) => {
        if (!value) return;
        const showFav = value === "favorites";
        setFilter("showOnlyFavorites", showFav);
        window.history.replaceState({}, "", showFav ? "/?favorites=1" : "/");
      }}
      className="gap-0"
    >
      <ToggleGroupItem
        value="all"
        aria-label="全て表示"
        size="sm"
        className="gap-1.5 data-[state=on]:bg-accent"
      >
        <List className="size-4" />
        <span className="hidden sm:inline text-xs">全て</span>
      </ToggleGroupItem>
      <ToggleGroupItem
        value="favorites"
        aria-label="お気に入りだけ"
        size="sm"
        className="gap-1.5 data-[state=on]:bg-accent"
      >
        <Star className="size-4" />
        <span className="hidden sm:inline text-xs">お気に入り</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
