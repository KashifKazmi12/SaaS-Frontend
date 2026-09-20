import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { ModuleParentSelect } from "@/components/modules";
import { PageShell } from "@/components/layout/PageShell";
import { RequirePermission } from "@/components/layout/RouteGuards";
import {
  CrudDialog,
  DataTableCard,
  FilterSelect,
  FormCheckboxField,
  FormField,
  ListFilters,
  ListPagination,
  PageAlerts,
  statusColumn,
  textColumn,
} from "@/components/shared";
import { useCrudPage } from "@/hooks/useCrudPage";
import { useListQuery } from "@/hooks/useListQuery";
import { ALL_FILTER, STATUS_FILTER_OPTIONS } from "@/lib/listFilters";
import { MODULE_PATHS } from "@/lib/modulePaths";
import type { ModuleRecord } from "@/types";

const MODULE_PATH = MODULE_PATHS.SETTINGS_MODULES;

export default function ModulesPage() {
  const crud = useCrudPage<ModuleRecord>();
  const list = useListQuery();
  const [modules, setModules] = useState<ModuleRecord[]>([]);
  const [parentModules, setParentModules] = useState<ModuleRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [order, setOrder] = useState("0");
  const [isSubModule, setIsSubModule] = useState(false);
  const [parentId, setParentId] = useState("");

  function parentName(moduleItem: ModuleRecord) {
    if (!moduleItem.parent) return "—";
    if (typeof moduleItem.parent === "object") return moduleItem.parent.name;
    return "—";
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
    []
  );

  async function loadModules() {
    await crud.runLoad(async () => {
      const data = await api.getModules(list.params);
      setModules(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      if (data.items.length === 0 && data.total > 0 && list.page > 1) {
        list.setPage(Math.max(1, data.totalPages));
      }
    }, "Unable to load modules.");
  }

  useEffect(() => {
    loadModules();
  }, [list.params]);

  useEffect(() => {
    api.getModuleOptions().then((data) => setParentModules(data.items)).catch(() => setParentModules([]));
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
          emptyMessage={
            list.activeCount > 0 ? "No modules match your filters." : "No modules yet."
          }
          filters={
            <ListFilters
              search={list.searchInput}
              onSearchChange={list.setSearchInput}
              searchPlaceholder="Search name or path..."
              activeCount={list.activeCount}
              onClear={list.clearFilters}
            >
              <FilterSelect
                value={list.getFilter("type")}
                onValueChange={(value) => list.setFilter("type", value)}
                options={[
                  { value: ALL_FILTER, label: "All types" },
                  { value: "main", label: "Main section" },
                  { value: "sub", label: "Sub section" },
                ]}
              />
              <FilterSelect
                value={list.getFilter("status")}
                onValueChange={(value) => list.setFilter("status", value)}
                options={STATUS_FILTER_OPTIONS}
              />
            </ListFilters>
          }
          pagination={
            <ListPagination
              page={list.page}
              limit={list.limit}
              total={total}
              totalPages={totalPages}
              onPageChange={list.setPage}
              onLimitChange={list.setLimit}
            />
          }
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
              modules={parentModules}
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
