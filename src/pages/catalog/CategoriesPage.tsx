import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { BusinessSelect } from "@/components/business";
import { DynamicEntityFields } from "@/components/entity-fields/DynamicEntityFields";
import { PageShell } from "@/components/layout/PageShell";
import { RequirePermission } from "@/components/layout/RouteGuards";
import {
  CrudDialog,
  DataTableCard,
  FileUploadField,
  FilterSelect,
  ListFilters,
  ListPagination,
  PageAlerts,
  imageColumn,
  statusColumn,
  textColumn,
} from "@/components/shared";
import { useBusinessOptions, useBusinessVisibility } from "@/hooks/useBusinessOptions";
import { resolveListBusinessId, useListSchemaFields } from "@/hooks/useListSchemaFields";
import { useCrudPage } from "@/hooks/useCrudPage";
import { useListQuery } from "@/hooks/useListQuery";
import { getBusinessDisplayName, shouldSendBusinessIdOnCreate } from "@/lib/business";
import { ALL_FILTER, STATUS_FILTER_OPTIONS } from "@/lib/listFilters";
import { resolveCategoryImageUrl } from "@/lib/media";
import { buildEntityPayload, formatCustomListValue } from "@/constants/entityFields";
import { MODULE_PATHS } from "@/lib/modulePaths";
import type { CategoryRecord, EntityFieldDefinition } from "@/types";

const MODULE_PATH = MODULE_PATHS.CATALOG_CATEGORIES;

function categoryFormValues(category?: CategoryRecord): Record<string, unknown> {
  if (!category) {
    return { name: "", description: "" };
  }

  return {
    name: category.name || "",
    description: category.description || "",
    ...(category.custom || {}),
  };
}

function formatCategoryBusiness(category: CategoryRecord) {
  return getBusinessDisplayName(category.business);
}

export default function CategoriesPage() {
  const { user } = useAuth();
  const { isSuperAdmin, showBusinessColumn, singleAssignedBusiness } = useBusinessVisibility();
  const crud = useCrudPage<CategoryRecord>();
  const list = useListQuery();
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [formValues, setFormValues] = useState<Record<string, unknown>>(categoryFormValues());
  const [schemaFields, setSchemaFields] = useState<EntityFieldDefinition[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [imagePath, setImagePath] = useState("");
  const [businessId, setBusinessId] = useState("");
  const { options: businessOptions } = useBusinessOptions(isSuperAdmin ? "all" : "assigned");
  const listBusinessId = resolveListBusinessId(
    list.getFilter("businessId"),
    singleAssignedBusiness?.id
  );
  const listCustomFields = useListSchemaFields("category", listBusinessId);

  const columns = useMemo(
    () => [
      imageColumn<CategoryRecord>(
        "image",
        "Image",
        (category) => resolveCategoryImageUrl(category.imagePath),
        { alt: (category) => category.name }
      ),
      textColumn<CategoryRecord>("name", "Name", (category) => category.name, { primary: true }),
      textColumn<CategoryRecord>(
        "business",
        "Business",
        formatCategoryBusiness,
        { hidden: !showBusinessColumn }
      ),
      textColumn<CategoryRecord>("description", "Description", (category) => category.description),
      ...listCustomFields.map((field) =>
        textColumn<CategoryRecord>(
          `custom-${field.key}`,
          field.label,
          (category) => formatCustomListValue(category.custom?.[field.key], field)
        )
      ),
      statusColumn<CategoryRecord>(),
    ],
    [listCustomFields, showBusinessColumn]
  );

  async function loadCategories() {
    await crud.runLoad(async () => {
      const data = await api.getCategories(list.params);
      setCategories(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      if (data.items.length === 0 && data.total > 0 && list.page > 1) {
        list.setPage(Math.max(1, data.totalPages));
      }
    }, "Unable to load categories.");
  }

  useEffect(() => {
    loadCategories();
  }, [list.params]);

  useEffect(() => {
    if (!crud.dialogOpen || !businessId) {
      setSchemaFields([]);
      return;
    }

    let cancelled = false;
    setSchemaLoading(true);
    api
      .getCategorySchema(businessId)
      .then((data) => {
        if (!cancelled) setSchemaFields(data.fields);
      })
      .catch((err) => {
        if (!cancelled) {
          crud.setError(err instanceof Error ? err.message : "Unable to load category fields.");
          setSchemaFields([]);
        }
      })
      .finally(() => {
        if (!cancelled) setSchemaLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [businessId, crud.dialogOpen]);

  function updateField(key: string, value: unknown) {
    setFormValues((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setFormValues(categoryFormValues());
    setImagePath("");
    setBusinessId(user?.businesses?.[0]?.id || "");
  }

  function populateForm(category: CategoryRecord) {
    setFormValues(categoryFormValues(category));
    setImagePath(category.imagePath || "");
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

    if (schemaLoading || schemaFields.length === 0) {
      crud.setError("Category fields are still loading.");
      return;
    }

    const payload = buildEntityPayload("category", formValues, schemaFields);
    payload.imagePath = imagePath;

    if (!imagePath.trim()) {
      crud.setError("Category image is required.");
      return;
    }

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
          emptyMessage={
            list.activeCount > 0 ? "No categories match your filters." : "No categories yet."
          }
          filters={
            <ListFilters
              search={list.searchInput}
              onSearchChange={list.setSearchInput}
              searchPlaceholder="Search categories..."
              activeCount={list.activeCount}
              onClear={list.clearFilters}
            >
              {showBusinessColumn && (
                <FilterSelect
                  value={list.getFilter("businessId")}
                  onValueChange={(value) => list.setFilter("businessId", value)}
                  options={[
                    { value: ALL_FILTER, label: "All businesses" },
                    ...businessOptions.map((option) => ({
                      value: option.id,
                      label: option.name,
                    })),
                  ]}
                />
              )}
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
          className="sm:max-w-lg"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <BusinessSelect
              scope={isSuperAdmin ? "all" : "assigned"}
              value={businessId}
              onValueChange={setBusinessId}
              readOnly={Boolean(crud.editing)}
              required={!crud.editing}
            />

            {schemaLoading ? (
              <p className="text-muted-foreground text-sm sm:col-span-2">Loading fields...</p>
            ) : businessId && schemaFields.length > 0 ? (
              <DynamicEntityFields
                fields={schemaFields}
                values={formValues}
                onChange={updateField}
                idPrefix="category"
              />
            ) : (
              <p className="text-muted-foreground text-sm sm:col-span-2">
                Select a business to see its category fields.
              </p>
            )}
          </div>

          <FileUploadField
            id="category-image"
            label="Category image"
            mode="single"
            folder="categories"
            value={imagePath}
            onChange={setImagePath}
            required
            recommendedSize={{
              width: 600,
              height: 600,
              tip: "Square images work best. Other ratios are cropped with cover fit.",
            }}
          />
        </CrudDialog>
      </PageShell>
    </RequirePermission>
  );
}
