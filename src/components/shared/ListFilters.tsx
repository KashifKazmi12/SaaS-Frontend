import type { ReactNode } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  return (
    <div>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
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

        {(children || (activeCount > 0 && onClear)) && (
          <div className="flex flex-wrap items-center gap-2">
            {children}
            {activeCount > 0 && onClear && (
              <Button type="button" variant="ghost" size="sm" onClick={onClear}>
                <X className="size-3.5" />
                Clear
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
