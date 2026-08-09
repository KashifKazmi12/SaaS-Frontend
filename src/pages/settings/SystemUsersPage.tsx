import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { BusinessMultiSelect } from "@/components/business";
import { PageShell } from "@/components/layout/PageShell";
import { RequirePermission } from "@/components/layout/RouteGuards";
import { RoleSelect } from "@/components/role";
import {
  CrudDialog,
  DataTableCard,
  FormField,
  PageAlerts,
  statusColumn,
  textColumn,
} from "@/components/shared";
import { useCrudPage } from "@/hooks/useCrudPage";
import { formatAssignedBusinesses } from "@/lib/business";
import { MODULE_PATHS } from "@/lib/modulePaths";
import type { RoleRecord, UserRecord } from "@/types";

const MODULE_PATH = MODULE_PATHS.SETTINGS_USERS;

function formatBusinesses(user: UserRecord) {
  if (user.isSuperAdmin) return "—";
  return formatAssignedBusinesses(user.businesses);
}

export default function SystemUsersPage() {
  const crud = useCrudPage<UserRecord>();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [selectedBusinessIds, setSelectedBusinessIds] = useState<string[]>([]);

  const columns = useMemo(
    () => [
      textColumn<UserRecord>("name", "Name", (user) => user.name, { primary: true }),
      textColumn<UserRecord>("username", "Username", (user) => user.username),
      textColumn<UserRecord>("email", "Email", (user) => user.email),
      textColumn<UserRecord>("role", "Role", (user) =>
        user.isSuperAdmin ? "Super Admin" : user.role?.name || "No role"
      ),
      textColumn<UserRecord>("businesses", "Businesses", formatBusinesses, {
        cellClassName: "max-w-xs truncate",
      }),
      statusColumn<UserRecord>(),
    ],
    []
  );

  async function loadData() {
    await crud.runLoad(async () => {
      const [usersData, rolesData] = await Promise.all([api.getUsers(), api.getRoles()]);
      setUsers(usersData);
      setRoles(rolesData);
    }, "Unable to load users.");
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setName("");
    setUsername("");
    setEmail("");
    setPassword("");
    setRoleId("");
    setSelectedBusinessIds([]);
  }

  function populateForm(user: UserRecord) {
    setName(user.name);
    setUsername(user.username);
    setEmail(user.email);
    setPassword("");
    setRoleId(user.role?._id || "");
    setSelectedBusinessIds(user.businesses?.map((item) => item._id) || []);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const payload: Record<string, unknown> = {
      name,
      email,
      roleId: roleId || null,
      businessIds: selectedBusinessIds,
    };

    if (!crud.editing) {
      payload.username = username;
      payload.password = password;
    } else if (password) {
      payload.password = password;
    }

    await crud.runMutation(
      async () => {
        if (crud.editing) {
          await api.updateUser(crud.editing._id, payload);
        } else {
          await api.createUser(payload);
        }
      },
      {
        successMessage: crud.editing ? "User updated." : "User created.",
        reload: loadData,
        fallbackError: "Unable to save user.",
      }
    );
  }

  async function handleDelete(user: UserRecord) {
    await crud.runDelete(
      user.name,
      async () => {
        await api.deleteUser(user._id);
      },
      {
        successMessage: "User removed.",
        reload: loadData,
        fallbackError: "Unable to remove user.",
        canDelete: () => !user.isSuperAdmin,
      }
    );
  }

  return (
    <RequirePermission path={MODULE_PATH} action="view">
      <PageShell description="Add people to the system, assign a role, and choose which businesses they can access.">
        <PageAlerts error={crud.error} message={crud.message} />

        <DataTableCard
          title="All users"
          modulePath={MODULE_PATH}
          columns={columns}
          data={users}
          getRowId={(user) => user._id}
          rowActions={{
            modulePath: MODULE_PATH,
            onEdit: (user) => crud.startEdit(user, populateForm),
            onDelete: handleDelete,
            hideDelete: (user) => user.isSuperAdmin,
          }}
          loading={crud.loading}
          loadingMessage="Loading users..."
          empty={!crud.loading && users.length === 0}
          emptyMessage="No users yet."
          createLabel="Add user"
          onCreate={() => crud.startCreate(resetForm)}
        />

        <CrudDialog
          open={crud.dialogOpen}
          onOpenChange={crud.setDialogOpen}
          editing={Boolean(crud.editing)}
          createTitle="Add user"
          editTitle="Edit user"
          createSubmitLabel="Create user"
          onSubmit={handleSubmit}
          className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        >
          <FormField
            id="user-name"
            label="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          {!crud.editing && (
            <FormField
              id="user-username"
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          )}

          <FormField
            id="user-email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <FormField
            id="user-password"
            label={crud.editing ? "New password (optional)" : "Password"}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!crud.editing}
          />

          {!crud.editing?.isSuperAdmin && (
            <RoleSelect roles={roles} value={roleId} onValueChange={setRoleId} />
          )}

          {!crud.editing?.isSuperAdmin && (
            <BusinessMultiSelect
              value={selectedBusinessIds}
              onValueChange={setSelectedBusinessIds}
              scope="all"
              hint="Select one or more businesses this user can access."
            />
          )}
        </CrudDialog>
      </PageShell>
    </RequirePermission>
  );
}
