import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { BusinessSelect } from "@/components/business";
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
import { useBusinessVisibility } from "@/hooks/useBusinessOptions";
import { useCrudPage } from "@/hooks/useCrudPage";
import { getBusinessDisplayName, shouldSendBusinessIdOnCreate } from "@/lib/business";
import { MODULE_PATHS } from "@/lib/modulePaths";
import type { CategoryRecord } from "@/types";

const MODULE_PATH = MODULE_PATHS.CATALOG_CATEGORIES;

function formatCategoryBusiness(category: CategoryRecord) {
  return getBusinessDisplayName(category.business);
}

export default function CategoriesPage() {
  const { user } = useAuth();
  const { isSuperAdmin, showBusinessColumn } = useBusinessVisibility();
  const crud = useCrudPage<CategoryRecord>();
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [businessId, setBusinessId] = useState("");

  const columns = useMemo(
    () => [
      textColumn<CategoryRecord>("name", "Name", (category) => category.name, { primary: true }),
      textColumn<CategoryRecord>(
        "business",
        "Business",
        formatCategoryBusiness,
        { hidden: !showBusinessColumn }
      ),
      textColumn<CategoryRecord>("description", "Description", (category) => category.description),
      statusColumn<CategoryRecord>(),
    ],
    [showBusinessColumn]
  );

  async function loadCategories() {
    await crud.runLoad(async () => {
      const data = await api.getCategories();
      setCategories(data);
    }, "Unable to load categories.");
  }

  useEffect(() => {
    loadCategories();
  }, []);

  function resetForm() {
    setName("");
    setDescription("");
    setBusinessId(user?.businesses?.[0]?.id || "");
  }

  function populateForm(category: CategoryRecord) {
    setName(category.name);
    setDescription(category.description);
    setBusinessId(
      typeof category.business === "object" && category.business
        ? category.business._id
        : typeof category.business === "string"
          ? category.business
          : ""
    );
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const payload: Record<string, unknown> = { name, description };

    if (!crud.editing && shouldSendBusinessIdOnCreate(user)) {
      payload.businessId = businessId;
    }

    await crud.runMutation(
      async () => {
        if (crud.editing) {
          await api.updateCategory(crud.editing._id, payload);
        } else {
          await api.createCategory(payload);
        }
      },
      {
        successMessage: crud.editing ? "Category updated." : "Category created.",
        reload: loadCategories,
        fallbackError: "Unable to save category.",
      }
    );
  }

  async function handleDelete(category: CategoryRecord) {
    await crud.runDelete(
      category.name,
      async () => {
        await api.deleteCategory(category._id);
      },
      {
        successMessage: "Category removed.",
        reload: loadCategories,
        fallbackError: "Unable to remove category.",
      }
    );
  }

  return (
    <RequirePermission path={MODULE_PATH} action="view">
      <PageShell description="Group catalog items by category for each business.">
        <PageAlerts error={crud.error} message={crud.message} />

        <DataTableCard
          title="All categories"
          modulePath={MODULE_PATH}
          columns={columns}
          data={categories}
          getRowId={(category) => category._id}
          rowActions={{
            modulePath: MODULE_PATH,
            onEdit: (category) => crud.startEdit(category, populateForm),
            onDelete: handleDelete,
          }}
          loading={crud.loading}
          loadingMessage="Loading categories..."
          empty={!crud.loading && categories.length === 0}
          emptyMessage="No categories yet."
          createLabel="Add category"
          onCreate={() => crud.startCreate(resetForm)}
        />

        <CrudDialog
          open={crud.dialogOpen}
          onOpenChange={crud.setDialogOpen}
          editing={Boolean(crud.editing)}
          createTitle="Add category"
          editTitle="Edit category"
          createSubmitLabel="Create category"
          onSubmit={handleSubmit}
          className="sm:max-w-md"
        >
          <BusinessSelect
            scope={isSuperAdmin ? "all" : "assigned"}
            value={businessId}
            onValueChange={setBusinessId}
            readOnly={Boolean(crud.editing)}
            required={!crud.editing}
          />

          <FormField
            id="category-name"
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <FormField
            id="category-description"
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </CrudDialog>
      </PageShell>
    </RequirePermission>
  );
}
