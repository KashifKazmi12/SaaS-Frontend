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
  onEdit: (row: T) => void;
  onDelete: (row: T) => void;
  hideDelete?: (row: T) => boolean;
  extraActions?: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  rowActions?: DataTableRowActions<T>;
  actionsHeader?: string;
}

export function DataTable<T>({
  columns,
  data,
  getRowId,
  rowActions,
  actionsHeader = "Actions",
}: DataTableProps<T>) {
  const visibleColumns = columns.filter((column) => !column.hidden);

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
        {data.map((row) => (
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
                  onEdit={() => rowActions.onEdit(row)}
                  onDelete={() => rowActions.onDelete(row)}
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
