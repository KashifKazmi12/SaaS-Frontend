import { useCallback } from "react";
import type { ModuleRecord, Permission, RoleRecord } from "@/types";
import { PERMISSIONS } from "@/types";

export interface PermissionDraftEntry {
  moduleId: string;
  moduleName: string;
  permissions: Permission[];
}

export function buildPermissionDraft(
  modules: ModuleRecord[],
  role?: RoleRecord | null
): PermissionDraftEntry[] {
  return modules.map((moduleItem) => {
    const existing = role?.modulePermissions.find((entry) => {
      const mod = entry.module;
      const modId = typeof mod === "object" ? mod._id : mod;
      return modId === moduleItem._id;
    });

    return {
      moduleId: moduleItem._id,
      moduleName: moduleItem.name,
      permissions: existing?.permissions || [],
    };
  });
}

export function usePermissionDraft(modules: ModuleRecord[]) {
  const modulePermissionsPayload = useCallback((draft: PermissionDraftEntry[]) => {
    return draft
      .filter((entry) => entry.permissions.length > 0)
      .map((entry) => ({
        moduleId: entry.moduleId,
        permissions: entry.permissions,
      }));
  }, []);

  const togglePermission = useCallback(
    (
      draft: PermissionDraftEntry[],
      moduleId: string,
      permission: Permission,
      checked: boolean
    ) =>
      draft.map((entry) => {
        if (entry.moduleId !== moduleId) return entry;

        const permissions = checked
          ? [...new Set([...entry.permissions, permission])]
          : entry.permissions.filter((item) => item !== permission);

        return { ...entry, permissions };
      }),
    []
  );

  const toggleAll = useCallback(
    (draft: PermissionDraftEntry[], moduleId: string, checked: boolean) =>
      draft.map((entry) =>
        entry.moduleId === moduleId
          ? { ...entry, permissions: checked ? [...PERMISSIONS] : [] }
          : entry
      ),
    []
  );

  const permissionSummary = useCallback((role: RoleRecord) => {
    return role.modulePermissions
      .map((entry) => {
        const mod = entry.module;
        const modName = typeof mod === "object" ? mod.name : "Module";
        return `${modName} (${entry.permissions.length})`;
      })
      .join(", ");
  }, []);

  return {
    buildFromRole: (role?: RoleRecord | null) => buildPermissionDraft(modules, role),
    togglePermission,
    toggleAll,
    toModulePermissions: modulePermissionsPayload,
    permissionSummary,
  };
}
