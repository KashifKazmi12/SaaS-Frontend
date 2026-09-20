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

export interface DataTableColumn<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  cellClassName?: string;
  headerClassName?: string;
  hidden?: boolean;
}

export interface DataTableRowActions<T> {
  modulePath: ModulePath;
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  showView?: boolean;
  showEdit?: boolean;
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
    <Table>
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
                {rowActions && (
                  <TableCell>
                    <RowActions
                      modulePath={rowActions.modulePath}
                      onView={rowActions.onView ? () => rowActions.onView?.(row) : undefined}
                      onEdit={rowActions.onEdit ? () => rowActions.onEdit?.(row) : undefined}
                      onDelete={rowActions.onDelete ? () => rowActions.onDelete?.(row) : undefined}
                      showView={rowActions.showView}
                      showEdit={rowActions.showEdit}
                      hideDelete={rowActions.hideDelete?.(row)}
                      extra={rowActions.extraActions?.(row)}
                    />
                  </TableCell>
                )}
              </TableRow>
            ))}
      </TableBody>
    </Table>
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
  }
): DataTableColumn<T> {
  const emptyFallback = options?.emptyFallback ?? "—";

  return {
    id,
    header,
    hidden: options?.hidden,
    headerClassName: options?.headerClassName,
    cellClassName: cn(options?.primary && "font-medium", options?.cellClassName),
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
  options?: { hidden?: boolean; header?: string }
): DataTableColumn<T> {
  return {
    id: "status",
    header: options?.header ?? "Status",
    hidden: options?.hidden,
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
  }
): DataTableColumn<T> {
  return {
    id,
    header,
    hidden: options?.hidden,
    headerClassName: options?.headerClassName,
    cellClassName: cn("w-14", options?.cellClassName),
    cell: (row) => {
      const src = getSrc(row);
      if (!src) return "—";
      return (
        <MediaThumbnail
          src={src}
          alt={options?.alt?.(row) ?? ""}
        />
      );
    },
  };
}
