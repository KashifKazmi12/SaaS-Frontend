import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { PermissionMatrix } from "@/components/role";
import { PageShell } from "@/components/layout/PageShell";
import { RequirePermission } from "@/components/layout/RouteGuards";
import {
  CrudDialog,
  DataTableCard,
  FormField,
  PageAlerts,
  textColumn,
} from "@/components/shared";
import { useCrudPage } from "@/hooks/useCrudPage";
import {
  type PermissionDraftEntry,
  usePermissionDraft,
} from "@/hooks/usePermissionDraft";
import { MODULE_PATHS } from "@/lib/modulePaths";
import type { ModuleRecord, Permission, RoleRecord } from "@/types";

const MODULE_PATH = MODULE_PATHS.SETTINGS_ROLES;

export default function RolesPage() {
  const crud = useCrudPage<RoleRecord>();
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [allModules, setAllModules] = useState<ModuleRecord[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissionDraft, setPermissionDraft] = useState<PermissionDraftEntry[]>([]);

  const {
    buildFromRole,
    togglePermission,
    toggleAll,
    toModulePermissions,
    permissionSummary,
  } = usePermissionDraft(allModules);

  const columns = useMemo(
    () => [
      textColumn<RoleRecord>("name", "Name", (role) => role.name, { primary: true }),
      textColumn<RoleRecord>("description", "Description", (role) => role.description),
      textColumn<RoleRecord>(
        "accessSummary",
        "Access summary",
        (role) => permissionSummary(role) || "No access assigned",
        { cellClassName: "max-w-md truncate" }
      ),
    ],
    [permissionSummary]
  );

  async function loadData() {
    await crud.runLoad(async () => {
      const [rolesData, modulesData] = await Promise.all([api.getRoles(), api.getModules()]);
      setRoles(rolesData);
      setAllModules(modulesData);
    }, "Unable to load roles.");
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setName("");
    setDescription("");
    setPermissionDraft(buildFromRole(null));
  }

  function populateForm(role: RoleRecord) {
    setName(role.name);
    setDescription(role.description);
    setPermissionDraft(buildFromRole(role));
  }

  function handleTogglePermission(moduleId: string, permission: Permission, checked: boolean) {
    setPermissionDraft((current) => togglePermission(current, moduleId, permission, checked));
  }

  function handleToggleAll(moduleId: string, checked: boolean) {
    setPermissionDraft((current) => toggleAll(current, moduleId, checked));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const payload = {
      name,
      description,
      modulePermissions: toModulePermissions(permissionDraft),
    };

    await crud.runMutation(
      async () => {
        if (crud.editing) {
          await api.updateRole(crud.editing._id, payload);
        } else {
          await api.createRole(payload);
        }
      },
      {
        successMessage: crud.editing ? "Role updated." : "Role created.",
        reload: loadData,
        fallbackError: "Unable to save role.",
      }
    );
  }

  async function handleDelete(role: RoleRecord) {
    await crud.runDelete(
      role.name,
      async () => {
        await api.deleteRole(role._id);
      },
      {
        successMessage: "Role removed.",
        reload: loadData,
        fallbackError: "Unable to remove role.",
      }
    );
  }

  return (
    <RequirePermission path={MODULE_PATH} action="view">
      <PageShell description="Create roles and choose what each role can do in every module.">
        <PageAlerts error={crud.error} message={crud.message} />

        <DataTableCard
          title="All roles"
          modulePath={MODULE_PATH}
          columns={columns}
          data={roles}
          getRowId={(role) => role._id}
          rowActions={{
            modulePath: MODULE_PATH,
            onEdit: (role) => crud.startEdit(role, populateForm),
            onDelete: handleDelete,
          }}
          loading={crud.loading}
          loadingMessage="Loading roles..."
          empty={!crud.loading && roles.length === 0}
          emptyMessage="No roles yet."
          createLabel="Create role"
          onCreate={() => crud.startCreate(resetForm)}
        />

        <CrudDialog
          open={crud.dialogOpen}
          onOpenChange={crud.setDialogOpen}
          editing={Boolean(crud.editing)}
          createTitle="Create role"
          editTitle="Edit role"
          createSubmitLabel="Create role"
          onSubmit={handleSubmit}
          className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="role-name"
              label="Role name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <FormField
              id="role-description"
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <PermissionMatrix
            draft={permissionDraft}
            onTogglePermission={handleTogglePermission}
            onToggleAll={handleToggleAll}
          />
        </CrudDialog>
      </PageShell>
    </RequirePermission>
  );
}
