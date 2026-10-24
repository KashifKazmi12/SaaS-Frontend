import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ModulePath } from "@/lib/modulePaths";
import { cn } from "@/lib/utils";
import { RowActions } from "./RowActions";
import { StatusBadge } from "./StatusBadge";
import { MediaThumbnail } from "./MediaThumbnail";

export type DataTableMobileRole = "media" | "title" | "badge" | "field" | "hidden";

export interface DataTableColumn<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  cellClassName?: string;
  headerClassName?: string;
  hidden?: boolean;
  /** Controls how this column appears in the mobile card layout. */
  mobile?: {
    role?: DataTableMobileRole;
  };
}

export interface DataTableRowActions<T> {
  modulePath: ModulePath;
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  showView?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  hideDelete?: (row: T) => boolean;
  extraActions?: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  rowActions?: DataTableRowActions<T>;
  actionsHeader?: string;
  loading?: boolean;
  loadingRows?: number;
}

function headerLabel(header: ReactNode, fallback: string): string {
  if (typeof header === "string" || typeof header === "number") return String(header);
  return fallback;
}

function resolveMobileRole(column: DataTableColumn<unknown>): DataTableMobileRole {
  if (column.mobile?.role) return column.mobile.role;
  if (column.id === "image" || column.id === "logo") return "media";
  if (column.id === "status") return "badge";
  if (column.cellClassName?.includes("font-medium")) return "title";
  return "field";
}

function isEmptyMobileValue(value: ReactNode): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && (value.trim() === "" || value.trim() === "—")) return true;
  return false;
}

function renderRowActions<T>(rowActions: DataTableRowActions<T>, row: T) {
  return (
    <RowActions
      modulePath={rowActions.modulePath}
      onView={rowActions.onView ? () => rowActions.onView?.(row) : undefined}
      onEdit={rowActions.onEdit ? () => rowActions.onEdit?.(row) : undefined}
      onDelete={rowActions.onDelete ? () => rowActions.onDelete?.(row) : undefined}
      showView={rowActions.showView}
      showEdit={rowActions.showEdit}
      showDelete={rowActions.showDelete}
      hideDelete={rowActions.hideDelete?.(row)}
      extra={rowActions.extraActions?.(row)}
    />
  );
}

function MobileCards<T>({
  columns,
  data,
  getRowId,
  rowActions,
  loading,
  skeletonCount,
}: {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  rowActions?: DataTableRowActions<T>;
  loading: boolean;
  skeletonCount: number;
}) {
  if (loading) {
    return (
      <div className="space-y-2 md:hidden">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <div
            key={`mobile-skeleton-${index}`}
            className="rounded-lg border border-border/40 bg-background/60 p-3 dark:bg-background/30"
          >
            <div className="flex items-start gap-3">
              <div className="bg-muted size-10 shrink-0 animate-pulse rounded-md" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="bg-muted h-4 w-2/3 animate-pulse rounded" />
                <div className="bg-muted h-3 w-1/2 animate-pulse rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2 md:hidden">
      {data.map((row) => {
        const mediaCol = columns.find((column) => resolveMobileRole(column as DataTableColumn<unknown>) === "media");
        const titleCol =
          columns.find((column) => resolveMobileRole(column as DataTableColumn<unknown>) === "title") ||
          columns.find((column) => resolveMobileRole(column as DataTableColumn<unknown>) === "field");
        const badgeCols = columns.filter(
          (column) => resolveMobileRole(column as DataTableColumn<unknown>) === "badge"
        );
        const fieldCols = columns.filter((column) => {
          const role = resolveMobileRole(column as DataTableColumn<unknown>);
          if (role !== "field") return false;
          if (column === titleCol) return false;
          return !isEmptyMobileValue(column.cell(row));
        });

        return (
          <article
            key={getRowId(row)}
            className="rounded-lg border border-border/40 bg-background/70 p-3 dark:bg-background/25"
          >
            <div className="flex items-start gap-3">
              {mediaCol ? (
                <div className="shrink-0">{mediaCol.cell(row)}</div>
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    {titleCol ? (
                      <div className="truncate text-sm font-medium leading-snug">
                        {titleCol.cell(row)}
                      </div>
                    ) : null}
                    {badgeCols.length > 0 ? (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {badgeCols.map((column) => (
                          <div key={column.id}>{column.cell(row)}</div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {rowActions ? (
                    <div className="shrink-0">{renderRowActions(rowActions, row)}</div>
                  ) : null}
                </div>
              </div>
            </div>

            {fieldCols.length > 0 ? (
              <dl className="mt-3 space-y-1.5 border-t border-border/40 pt-2.5">
                {fieldCols.map((column) => (
                  <div key={column.id} className="flex items-start justify-between gap-3 text-xs">
                    <dt className="text-muted-foreground shrink-0">
                      {headerLabel(column.header, column.id)}
                    </dt>
                    <dd className="min-w-0 text-right break-words">{column.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

export function DataTable<T>({
  columns,
  data,
  getRowId,
  rowActions,
  actionsHeader = "Actions",
  loading = false,
  loadingRows = 8,
}: DataTableProps<T>) {
  const visibleColumns = columns.filter((column) => !column.hidden);
  const columnCount = visibleColumns.length + (rowActions ? 1 : 0);
  const skeletonCount = data.length > 0 ? Math.min(data.length, 10) : loadingRows;

  return (
    <>
      <MobileCards
        columns={visibleColumns}
        data={data}
        getRowId={getRowId}
        rowActions={rowActions}
        loading={loading}
        skeletonCount={Math.min(skeletonCount, 5)}
      />

      <div className="hidden md:block">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              {visibleColumns.map((column) => (
                <TableHead key={column.id} className={column.headerClassName}>
                  {column.header}
                </TableHead>
              ))}
              {rowActions && <TableHead>{actionsHeader}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? Array.from({ length: skeletonCount }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`} className="hover:bg-transparent">
                    {Array.from({ length: columnCount }).map((__, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <div
                          className={cn(
                            "bg-muted h-4 animate-pulse rounded",
                            cellIndex === 0 ? "w-2/3" : "w-1/2"
                          )}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : data.map((row) => (
                  <TableRow key={getRowId(row)}>
                    {visibleColumns.map((column) => (
                      <TableCell key={column.id} className={column.cellClassName}>
                        {column.cell(row)}
                      </TableCell>
                    ))}
                    {rowActions && <TableCell>{renderRowActions(rowActions, row)}</TableCell>}
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

export function textColumn<T>(
  id: string,
  header: string,
  accessor: (row: T) => ReactNode,
  options?: {
    primary?: boolean;
    cellClassName?: string;
    headerClassName?: string;
    hidden?: boolean;
    emptyFallback?: string;
    mobile?: DataTableColumn<T>["mobile"];
  }
): DataTableColumn<T> {
  const emptyFallback = options?.emptyFallback ?? "—";

  return {
    id,
    header,
    hidden: options?.hidden,
    headerClassName: options?.headerClassName,
    cellClassName: cn(options?.primary && "font-medium", options?.cellClassName),
    mobile: options?.mobile ?? (options?.primary ? { role: "title" } : { role: "field" }),
    cell: (row) => {
      const value = accessor(row);
      if (value === null || value === undefined || value === "") {
        return emptyFallback;
      }
      return value;
    },
  };
}

export function statusColumn<T extends { isActive: boolean }>(
  options?: { hidden?: boolean; header?: string; mobile?: DataTableColumn<T>["mobile"] }
): DataTableColumn<T> {
  return {
    id: "status",
    header: options?.header ?? "Status",
    hidden: options?.hidden,
    mobile: options?.mobile ?? { role: "badge" },
    cell: (row) => <StatusBadge active={row.isActive} />,
  };
}

export function imageColumn<T>(
  id: string,
  header: string,
  getSrc: (row: T) => string,
  options?: {
    hidden?: boolean;
    alt?: (row: T) => string;
    headerClassName?: string;
    cellClassName?: string;
    mobile?: DataTableColumn<T>["mobile"];
  }
): DataTableColumn<T> {
  return {
    id,
    header,
    hidden: options?.hidden,
    headerClassName: options?.headerClassName,
    cellClassName: cn("w-14", options?.cellClassName),
    mobile: options?.mobile ?? { role: "media" },
    cell: (row) => (
      <MediaThumbnail src={getSrc(row)} alt={options?.alt?.(row) ?? ""} />
    ),
  };
}
