import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PermissionDraftEntry } from "@/hooks/usePermissionDraft";
import { PERMISSIONS, PERMISSION_LABELS, type Permission } from "@/types";

interface PermissionMatrixProps {
  draft: PermissionDraftEntry[];
  onTogglePermission: (moduleId: string, permission: Permission, checked: boolean) => void;
  onToggleAll: (moduleId: string, checked: boolean) => void;
  className?: string;
}

export function PermissionMatrix({
  draft,
  onTogglePermission,
  onToggleAll,
  className,
}: PermissionMatrixProps) {
  return (
    <div className={className ?? "overflow-x-auto rounded-lg border"}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Module</TableHead>
            <TableHead>All</TableHead>
            {PERMISSIONS.map((permission) => (
              <TableHead key={permission}>{PERMISSION_LABELS[permission]}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {draft.map((entry) => {
            const allChecked = PERMISSIONS.every((permission) =>
              entry.permissions.includes(permission)
            );

            return (
              <TableRow key={entry.moduleId}>
                <TableCell className="font-medium">{entry.moduleName}</TableCell>
                <TableCell>
                  <Checkbox
                    checked={allChecked}
                    onCheckedChange={(checked) => onToggleAll(entry.moduleId, Boolean(checked))}
                  />
                </TableCell>
                {PERMISSIONS.map((permission) => (
                  <TableCell key={permission}>
                    <Checkbox
                      checked={entry.permissions.includes(permission)}
                      onCheckedChange={(checked) =>
                        onTogglePermission(entry.moduleId, permission, Boolean(checked))
                      }
                    />
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
