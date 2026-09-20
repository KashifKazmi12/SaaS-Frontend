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
}

export function ListPagination({
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
}: ListPaginationProps) {
  if (total === 0) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        Showing {from}–{to} of {total}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          value={String(limit)}
          onValueChange={(value) => onLimitChange(Number(value))}
          options={PAGE_SIZE_OPTIONS.map((size) => ({
            value: String(size),
            label: `${size} / page`,
          }))}
          className="sm:w-32"
        />

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="size-3.5" />
            Prev
          </Button>
          <span className="min-w-20 px-2 text-center text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
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
