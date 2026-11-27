import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PAGE_SIZE_OPTIONS } from "@/hooks/useListQuery";
import { FilterSelect } from "./FilterSelect";

interface ListPaginationProps {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  /** Cross-page selection count (e.g. stock bulk update). */
  selectedCount?: number;
  onClearSelection?: () => void;
}

export function ListPagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  selectedCount = 0,
  onClearSelection,
}: ListPaginationProps) {
  if (total === 0) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col gap-3 border-t border-border/40 pt-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        Showing {from}–{to} of {total}
        {selectedCount > 0 ? (
          <>
            {" "}
            · {selectedCount} selected
            {onClearSelection ? (
              <>
                {" "}
                ·{" "}
                <button
                  type="button"
                  className="text-foreground underline-offset-2 hover:underline"
                  onClick={onClearSelection}
                >
                  Clear
                </button>
              </>
            ) : null}
          </>
        ) : null}
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <FilterSelect
          value={String(limit)}
          onValueChange={(value) => onLimitChange(Number(value))}
          options={PAGE_SIZE_OPTIONS.map((size) => ({
            value: String(size),
            label: `${size} / page`,
          }))}
          className="w-full sm:w-32"
        />

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="size-3.5" />
            Prev
          </Button>
          <span className="min-w-16 px-1 text-center text-xs text-muted-foreground sm:min-w-20 sm:px-2">
            {page}/{totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
