import type { ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { ModulePath } from "@/lib/modulePaths";
import { PermissionIconButton } from "./PermissionIconButton";

interface RowActionsProps {
  modulePath: ModulePath;
  onEdit?: () => void;
  onDelete?: () => void;
  showEdit?: boolean;
  showDelete?: boolean;
  hideDelete?: boolean;
  extra?: ReactNode;
}

export function RowActions({
  modulePath,
  onEdit,
  onDelete,
  showEdit = true,
  showDelete = true,
  hideDelete = false,
  extra,
}: RowActionsProps) {
  return (
    <div className="flex items-center gap-1">
      {extra}
      {showEdit && onEdit && (
        <PermissionIconButton
          modulePath={modulePath}
          action="update"
          variant="outline"
          size="icon-sm"
          label="Edit"
          icon={<Pencil className="size-3.5" />}
          onClick={onEdit}
        />
      )}
      {showDelete && onDelete && !hideDelete && (
        <PermissionIconButton
          modulePath={modulePath}
          action="delete"
          variant="destructive"
          size="icon-sm"
          label="Delete"
          icon={<Trash2 className="size-3.5" />}
          onClick={onDelete}
        />
      )}
    </div>
  );
}
