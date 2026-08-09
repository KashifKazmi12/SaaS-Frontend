import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { PageShell } from "@/components/layout/PageShell";
import { RequirePermission } from "@/components/layout/RouteGuards";
import {
  CrudDialog,
  DataTableCard,
  FormField,
  PageAlerts,
  statusColumn,
  textColumn,
} from "@/components/shared";
import { useCrudPage } from "@/hooks/useCrudPage";
import { MODULE_PATHS } from "@/lib/modulePaths";
import type { BusinessGroupRecord } from "@/types";

const MODULE_PATH = MODULE_PATHS.BUSINESS_GROUPS;

export default function BusinessGroupsPage() {
  const crud = useCrudPage<BusinessGroupRecord>();
  const [groups, setGroups] = useState<BusinessGroupRecord[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const columns = useMemo(
    () => [
      textColumn<BusinessGroupRecord>("name", "Name", (group) => group.name, { primary: true }),
      textColumn<BusinessGroupRecord>("description", "Description", (group) => group.description),
      statusColumn<BusinessGroupRecord>(),
    ],
    []
  );

  async function loadGroups() {
    await crud.runLoad(async () => {
      const data = await api.getBusinessGroups();
      setGroups(data);
    }, "Unable to load business groups.");
  }

  useEffect(() => {
    loadGroups();
  }, []);

  function resetForm() {
    setName("");
    setDescription("");
  }

  function populateForm(group: BusinessGroupRecord) {
    setName(group.name);
    setDescription(group.description);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    await crud.runMutation(
      async () => {
        if (crud.editing) {
          await api.updateBusinessGroup(crud.editing._id, { name, description });
        } else {
          await api.createBusinessGroup({ name, description });
        }
      },
      {
        successMessage: crud.editing ? "Business group updated." : "Business group created.",
        reload: loadGroups,
        fallbackError: "Unable to save business group.",
      }
    );
  }

  async function handleDelete(group: BusinessGroupRecord) {
    await crud.runDelete(
      group.name,
      async () => {
        await api.deleteBusinessGroup(group._id);
      },
      {
        successMessage: "Business group removed.",
        reload: loadGroups,
        fallbackError: "Unable to remove business group.",
      }
    );
  }

  return (
    <RequirePermission path={MODULE_PATH} action="view">
      <PageShell description="Group businesses together for easy reference. More features can be added later.">
        <PageAlerts error={crud.error} message={crud.message} />

        <DataTableCard
          title="All business groups"
          modulePath={MODULE_PATH}
          columns={columns}
          data={groups}
          getRowId={(group) => group._id}
          rowActions={{
            modulePath: MODULE_PATH,
            onEdit: (group) => crud.startEdit(group, populateForm),
            onDelete: handleDelete,
          }}
          loading={crud.loading}
          loadingMessage="Loading business groups..."
          empty={!crud.loading && groups.length === 0}
          emptyMessage="No business groups yet."
          createLabel="Create group"
          onCreate={() => crud.startCreate(resetForm)}
        />

        <CrudDialog
          open={crud.dialogOpen}
          onOpenChange={crud.setDialogOpen}
          editing={Boolean(crud.editing)}
          createTitle="Create business group"
          editTitle="Edit business group"
          createSubmitLabel="Create group"
          onSubmit={handleSubmit}
        >
          <FormField
            id="group-name"
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <FormField
            id="group-description"
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </CrudDialog>
      </PageShell>
    </RequirePermission>
  );
}
