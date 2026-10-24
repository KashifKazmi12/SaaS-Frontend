import type { ReactNode } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import type { ModulePath } from "@/lib/modulePaths";
import {
  DataTable,
  type DataTableColumn,
  type DataTableRowActions,
} from "./DataTable";
import { PermissionButton } from "./PermissionButton";

interface DataTableCardProps<T> {
  title: string;
  modulePath: ModulePath;
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  rowActions?: DataTableRowActions<T>;
  loading?: boolean;
  loadingMessage?: string;
  empty?: boolean;
  emptyMessage?: string;
  createLabel?: string;
  onCreate?: () => void;
  headerActions?: ReactNode;
  filters?: ReactNode;
  pagination?: ReactNode;
}

export function DataTableCard<T>({
  title,
  modulePath,
  columns,
  data,
  getRowId,
  rowActions,
  loading = false,
  loadingMessage = "Loading...",
  empty = false,
  emptyMessage = "No records yet.",
  createLabel,
  onCreate,
  headerActions,
  filters,
  pagination,
}: DataTableCardProps<T>) {
  const showHeaderActions = Boolean(headerActions || (createLabel && onCreate));

  return (
    <Card className="overflow-hidden border-0 bg-muted/20 ring-border/40 dark:bg-muted/15">
      <div className="flex flex-col gap-2.5 border-b border-border/40 px-(--card-spacing) pb-(--card-spacing) sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <CardTitle className="min-w-0 truncate text-base sm:text-lg">{title}</CardTitle>
        {showHeaderActions ? (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {headerActions}
            {createLabel && onCreate && (
              <PermissionButton
                modulePath={modulePath}
                action="create"
                onClick={onCreate}
                className="flex-1 sm:flex-none"
              >
                {createLabel}
              </PermissionButton>
            )}
          </div>
        ) : null}
      </div>

      {filters && (
        <div className="border-b border-border/40 bg-muted/15 px-(--card-spacing) py-3 dark:bg-muted/10">
          {filters}
        </div>
      )}

      <CardContent className="px-(--card-spacing) pt-3 sm:pt-4">
        {loading ? (
          <>
            <span className="sr-only">{loadingMessage}</span>
            <DataTable
              columns={columns}
              data={data}
              getRowId={getRowId}
              rowActions={rowActions}
              loading
            />
          </>
        ) : empty ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={data}
              getRowId={getRowId}
              rowActions={rowActions}
            />
            {pagination}
          </>
        )}
      </CardContent>
    </Card>
  );
}
