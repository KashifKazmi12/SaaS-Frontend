import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { ModuleParentSelect } from "@/components/modules";
import { PageShell } from "@/components/layout/PageShell";
import { RequirePermission } from "@/components/layout/RouteGuards";
import {
  CrudDialog,
  DataTableCard,
  FormCheckboxField,
  FormField,
  PageAlerts,
  statusColumn,
  textColumn,
} from "@/components/shared";
import { useCrudPage } from "@/hooks/useCrudPage";
import { MODULE_PATHS } from "@/lib/modulePaths";
import type { ModuleRecord } from "@/types";

const MODULE_PATH = MODULE_PATHS.SETTINGS_MODULES;

export default function ModulesPage() {
  const crud = useCrudPage<ModuleRecord>();
  const [modules, setModules] = useState<ModuleRecord[]>([]);
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [order, setOrder] = useState("0");
  const [isSubModule, setIsSubModule] = useState(false);
  const [parentId, setParentId] = useState("");

  function parentName(moduleItem: ModuleRecord) {
    if (!moduleItem.parent) return "—";
    if (typeof moduleItem.parent === "object") return moduleItem.parent.name;
    const parent = modules.find((item) => item._id === moduleItem.parent);
    return parent?.name || "—";
  }

  const columns = useMemo(
    () => [
      textColumn<ModuleRecord>("name", "Name", (moduleItem) => moduleItem.name, { primary: true }),
      textColumn<ModuleRecord>("path", "Path", (moduleItem) => moduleItem.path),
      textColumn<ModuleRecord>("order", "Order", (moduleItem) => moduleItem.order),
      textColumn<ModuleRecord>("type", "Type", (moduleItem) =>
        moduleItem.isSubModule ? "Sub section" : "Main section"
      ),
      textColumn<ModuleRecord>("parent", "Parent", parentName),
      statusColumn<ModuleRecord>(),
    ],
    [modules]
  );

  async function loadModules() {
    await crud.runLoad(async () => {
      const data = await api.getModules();
      setModules(data);
    }, "Unable to load modules.");
  }

  useEffect(() => {
    loadModules();
  }, []);

  function resetForm() {
    setName("");
    setPath("");
    setOrder("0");
    setIsSubModule(false);
    setParentId("");
  }

  function populateForm(moduleItem: ModuleRecord) {
    setName(moduleItem.name);
    setPath(moduleItem.path);
    setOrder(String(moduleItem.order));
    setIsSubModule(moduleItem.isSubModule);
    setParentId(
      typeof moduleItem.parent === "object" && moduleItem.parent
        ? moduleItem.parent._id
        : typeof moduleItem.parent === "string"
          ? moduleItem.parent
          : ""
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const payload = {
      name,
      path,
      order: Number(order),
      isSubModule,
      parentId: isSubModule ? parentId : null,
    };

    await crud.runMutation(
      async () => {
        if (crud.editing) {
          await api.updateModule(crud.editing._id, payload);
        } else {
          await api.createModule(payload);
        }
      },
      {
        successMessage: crud.editing ? "Module updated." : "Module created.",
        reload: loadModules,
        fallbackError: "Unable to save module.",
      }
    );
  }

  async function handleDelete(moduleItem: ModuleRecord) {
    await crud.runDelete(
      moduleItem.name,
      async () => {
        await api.deleteModule(moduleItem._id);
      },
      {
        successMessage: "Module removed.",
        reload: loadModules,
        fallbackError: "Unable to remove module.",
      }
    );
  }

  return (
    <RequirePermission path={MODULE_PATH} action="view">
      <PageShell description="Create pages for the sidebar and choose whether each one is a main section or a sub section.">
        <PageAlerts error={crud.error} message={crud.message} />

        <DataTableCard
          title="All modules"
          modulePath={MODULE_PATH}
          columns={columns}
          data={modules}
          getRowId={(moduleItem) => moduleItem._id}
          rowActions={{
            modulePath: MODULE_PATH,
            onEdit: (moduleItem) => crud.startEdit(moduleItem, populateForm),
            onDelete: handleDelete,
          }}
          loading={crud.loading}
          loadingMessage="Loading modules..."
          empty={!crud.loading && modules.length === 0}
          emptyMessage="No modules yet."
          createLabel="Create module"
          onCreate={() => crud.startCreate(resetForm)}
        />

        <CrudDialog
          open={crud.dialogOpen}
          onOpenChange={crud.setDialogOpen}
          editing={Boolean(crud.editing)}
          createTitle="Create module"
          editTitle="Edit module"
          createSubmitLabel="Create module"
          onSubmit={handleSubmit}
          className="sm:max-w-lg"
        >
          <FormField
            id="module-name"
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <FormField
            id="module-path"
            label="Path"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/products"
            required
          />
          <FormField
            id="module-order"
            label="Order"
            type="number"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            required
          />
          <FormCheckboxField
            id="module-is-sub"
            label="This is a sub section"
            checked={isSubModule}
            onCheckedChange={setIsSubModule}
          />
          {isSubModule && (
            <ModuleParentSelect
              modules={modules}
              value={parentId}
              onValueChange={setParentId}
              required={isSubModule}
            />
          )}
        </CrudDialog>
      </PageShell>
    </RequirePermission>
  );
}
