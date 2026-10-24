import { useEffect, useState, type ReactNode } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ListFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  children?: ReactNode;
  activeCount?: number;
  onClear?: () => void;
}

export function ListFilters({
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  children,
  activeCount = 0,
  onClear,
}: ListFiltersProps) {
  const hasFilterControls = Boolean(children) || (activeCount > 0 && onClear);
  const [filtersOpen, setFiltersOpen] = useState(activeCount > 0);

  useEffect(() => {
    if (activeCount > 0) setFiltersOpen(true);
  }, [activeCount]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
            aria-label={searchPlaceholder}
          />
        </div>

        {hasFilterControls ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 md:hidden"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <SlidersHorizontal className="size-3.5" />
            Filters
            {activeCount > 0 ? (
              <span className="bg-foreground text-background rounded-full px-1.5 text-[10px] leading-4">
                {activeCount}
              </span>
            ) : null}
          </Button>
        ) : null}
      </div>

      {hasFilterControls ? (
        <div
          className={cn(
            "grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:grid-cols-2 md:flex md:flex-wrap md:items-center",
            filtersOpen ? "grid" : "hidden md:flex"
          )}
        >
          {children}
          {activeCount > 0 && onClear ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="justify-self-start"
            >
              <X className="size-3.5" />
              Clear
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
