import type { ReactNode } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import type { ModulePath } from "@/lib/modulePaths";
import { PermissionIconButton } from "./PermissionIconButton";

interface RowActionsProps {
  modulePath: ModulePath;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showView?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  hideDelete?: boolean;
  extra?: ReactNode;
}

export function RowActions({
  modulePath,
  onView,
  onEdit,
  onDelete,
  showView = true,
  showEdit = true,
  showDelete = true,
  hideDelete = false,
  extra,
}: RowActionsProps) {
  return (
    <div className="flex items-center gap-1">
      {extra}
      {showView && onView && (
        <PermissionIconButton
          modulePath={modulePath}
          action="view"
          variant="outline"
          size="icon-sm"
          label="View"
          icon={<Eye className="size-3.5" />}
          onClick={onView}
        />
      )}
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
