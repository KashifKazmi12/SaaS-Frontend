import type { ReactNode } from "react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
}: DataTableCardProps<T>) {
  const showHeaderActions = Boolean(headerActions || (createLabel && onCreate));

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{title}</CardTitle>
        {showHeaderActions && (
          <CardAction>
            <div className="flex gap-2">
              {headerActions}
              {createLabel && onCreate && (
                <PermissionButton modulePath={modulePath} action="create" onClick={onCreate}>
                  {createLabel}
                </PermissionButton>
              )}
            </div>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="pt-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">{loadingMessage}</p>
        ) : empty ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <DataTable
            columns={columns}
            data={data}
            getRowId={getRowId}
            rowActions={rowActions}
          />
        )}
      </CardContent>
    </Card>
  );
}
