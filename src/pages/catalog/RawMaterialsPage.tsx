import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { BusinessSelect } from "@/components/business";
import { DynamicEntityFields } from "@/components/entity-fields/DynamicEntityFields";
import { PackagingsEditor, UnitSelect } from "@/components/catalog";
import { PageShell } from "@/components/layout/PageShell";
import { RequirePermission } from "@/components/layout/RouteGuards";
import {
  CrudDialog,
  DataTableCard,
  FilterSelect,
  FormField,
  ListFilters,
  ListPagination,
  PageAlerts,
  statusColumn,
  textColumn,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { useBusinessOptions, useBusinessVisibility } from "@/hooks/useBusinessOptions";
import { resolveListBusinessId, useListSchemaFields } from "@/hooks/useListSchemaFields";
import { useCrudPage } from "@/hooks/useCrudPage";
import { useListQuery } from "@/hooks/useListQuery";
import {
  getBusinessDisplayName,
  shouldSendBusinessIdOnCreate,
} from "@/lib/business";
import { MODULE_PATHS } from "@/lib/modulePaths";
import {
  PRODUCT_UNIT_LABELS,
  normalizeProductUnit,
  type ProductUnit,
} from "@/constants/catalog";
import {
  buildEntityPayload,
  formatCustomListValue,
  isEntityRootKey,
  isFieldVisible,
} from "@/constants/entityFields";
import type { EntityFieldDefinition, ProductPackaging, ProductRecord } from "@/types";
import { ALL_FILTER, STATUS_FILTER_OPTIONS } from "@/lib/listFilters";

const MODULE_PATH = MODULE_PATHS.CATALOG_PRODUCTS;

function formValues(product?: ProductRecord): Record<string, unknown> {
  if (!product) {
    return {
      name: "",
      description: "",
      basePrice: "0",
      costPrice: "0",
      sku: "",
      barcode: "",
    };
  }
  return {
    name: product.name || "",
    description: product.description || "",
    basePrice: String(product.basePrice ?? 0),
    costPrice: String(product.costPrice ?? 0),
    sku: product.sku || "",
    barcode: product.barcode || "",
  };
}

export default function RawMaterialsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSuperAdmin, showBusinessColumn, singleAssignedBusiness } = useBusinessVisibility();
  const crud = useCrudPage<ProductRecord>();
  const list = useListQuery();
  const [items, setItems] = useState<ProductRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [values, setValues] = useState<Record<string, unknown>>(formValues());
  const [schemaFields, setSchemaFields] = useState<EntityFieldDefinition[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [unit, setUnit] = useState<ProductUnit>("piece");
  const [packagings, setPackagings] = useState<ProductPackaging[]>([]);
  const [showPackaging, setShowPackaging] = useState(false);
  const [businessId, setBusinessId] = useState("");
  const { options: businessOptions } = useBusinessOptions(isSuperAdmin ? "all" : "assigned");
  const listBusinessId = resolveListBusinessId(
    list.getFilter("businessId"),
    singleAssignedBusiness?.id
  );
  const listCustomFields = useListSchemaFields("product", listBusinessId);

  const columns = useMemo(
    () => [
      textColumn<ProductRecord>("name", "Name", (row) => row.name, { primary: true }),
      textColumn<ProductRecord>(
        "business",
        "Business",
        (row) => getBusinessDisplayName(row.business),
        { hidden: !showBusinessColumn }
      ),
      textColumn<ProductRecord>("sku", "SKU", (row) => row.sku || "—"),
      textColumn<ProductRecord>("unit", "Unit", (row) =>
        PRODUCT_UNIT_LABELS[normalizeProductUnit(row.unit)] || row.unit
      ),
      ...listCustomFields.map((field) =>
        textColumn<ProductRecord>(
          `custom-${field.key}`,
          field.label,
          (row) => formatCustomListValue(row.custom?.[field.key], field)
        )
      ),
      statusColumn<ProductRecord>(),
    ],
    [listCustomFields, showBusinessColumn]
  );

  async function loadItems() {
    await crud.runLoad(async () => {
      const data = await api.getProducts({
        ...list.params,
        productKind: "raw",
      });
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      if (data.items.length === 0 && data.total > 0 && list.page > 1) {
        list.setPage(Math.max(1, data.totalPages));
      }
    }, "Unable to load raw materials.");
  }

  useEffect(() => {
    void loadItems();
  }, [list.params]);

  useEffect(() => {
    if (!crud.dialogOpen || !businessId) {
      setSchemaFields([]);
      return;
    }
    let cancelled = false;
    setSchemaLoading(true);
    api
      .getProductSchema(businessId)
      .then((data) => {
        if (!cancelled) setSchemaFields(data.fields);
      })
      .catch((err) => {
        if (!cancelled) {
          crud.setError(err instanceof Error ? err.message : "Unable to load fields.");
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
    setValues((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setValues(formValues());
    setUnit("piece");
    setPackagings([]);
    setShowPackaging(false);
    setBusinessId(user?.businesses?.[0]?.id || "");
  }

  async function populateForm(product: ProductRecord) {
    setValues(formValues(product));
    setUnit(normalizeProductUnit(product.unit || "piece"));
    setPackagings(Array.isArray(product.packagings) ? product.packagings : []);
    setShowPackaging(Boolean(product.packagings?.length));
    setBusinessId(
      typeof product.business === "object" && product.business
        ? product.business._id
        : typeof product.business === "string"
          ? product.business
          : ""
    );
    try {
      const detail = await api.getProduct(product._id);
      setUnit(normalizeProductUnit(detail.product.unit || "piece"));
      setPackagings(Array.isArray(detail.product.packagings) ? detail.product.packagings : []);
      setValues(formValues(detail.product));
    } catch {
      /* keep list values */
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (schemaLoading || schemaFields.length === 0) {
      crud.setError("Fields are still loading.");
      return;
    }

    const payload = buildEntityPayload("product", { ...values, unit }, schemaFields);
    payload.unit = unit;
    payload.productKind = "raw";
    payload.hasVariations = false;
    payload.recipe = [];
    payload.packagings = packagings
      .filter((row) => row.unit && Number(row.factorToBase) > 0)
      .map((row) => ({
        unit: normalizeProductUnit(row.unit),
        factorToBase: Number(row.factorToBase),
        label: row.label || "",
      }));
    payload.images = [];
    payload.categoryId = null;
    if (!crud.editing && shouldSendBusinessIdOnCreate(user)) {
      payload.businessId = businessId;
    }

    await crud.runMutation(
      async () => {
        if (crud.editing) {
          await api.updateProduct(crud.editing._id, payload);
        } else {
          await api.createProduct(payload);
        }
      },
      {
        successMessage: crud.editing ? "Raw material updated." : "Raw material created.",
        reload: loadItems,
        fallbackError: "Unable to save raw material.",
      }
    );
  }

  return (
    <RequirePermission path={MODULE_PATH} action="view">
      <PageShell description="Ingredients and purchase items used in recipes — not sold on orders.">
        <PageAlerts error={crud.error} message={crud.message} />

        <div className="mb-3">
          <Button
            type="button"
            variant="ghost"
            className="h-auto gap-1.5 px-0"
            onClick={() => navigate(MODULE_PATHS.CATALOG_PRODUCTS)}
          >
            <ArrowLeft className="size-4" />
            Back to products
          </Button>
        </div>

        <DataTableCard
          title="Raw materials"
          modulePath={MODULE_PATH}
          columns={columns}
          data={items}
          getRowId={(row) => row._id}
          rowActions={{
            modulePath: MODULE_PATH,
            onEdit: (row) => crud.startEdit(row, () => void populateForm(row)),
            onDelete: (row) =>
              void crud.runDelete(
                row.name,
                async () => {
                  await api.deleteProduct(row._id);
                },
                {
                  successMessage: "Raw material removed.",
                  reload: loadItems,
                  fallbackError: "Unable to remove raw material.",
                }
              ),
          }}
          loading={crud.loading}
          loadingMessage="Loading raw materials..."
          empty={!crud.loading && items.length === 0}
          emptyMessage={
            list.activeCount > 0
              ? "No raw materials match your filters."
              : "No raw materials yet. Add flour, ghee, packs you purchase, etc."
          }
          createLabel="Add raw material"
          onCreate={() => crud.startCreate(resetForm)}
          headerActions={
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(MODULE_PATHS.CATALOG_PRODUCTS)}
            >
              Sellable products
            </Button>
          }
          filters={
            <ListFilters
              search={list.searchInput}
              onSearchChange={list.setSearchInput}
              searchPlaceholder="Search raw materials..."
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
        />

        <CrudDialog
          open={crud.dialogOpen}
          onOpenChange={crud.setDialogOpen}
          editing={Boolean(crud.editing)}
          createTitle="Add raw material"
          editTitle="Edit raw material"
          createSubmitLabel="Create raw material"
          onSubmit={handleSubmit}
          className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
        >
          <BusinessSelect
            scope={isSuperAdmin ? "all" : "assigned"}
            value={businessId}
            onValueChange={setBusinessId}
            readOnly={Boolean(crud.editing)}
            required={!crud.editing}
          />

          {schemaLoading ? (
            <p className="text-sm text-muted-foreground">Loading fields...</p>
          ) : businessId && schemaFields.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <DynamicEntityFields
                fields={schemaFields.filter((field) =>
                  ["name", "description", "costPrice"].includes(field.key)
                )}
                values={values}
                onChange={updateField}
                idPrefix="raw"
              />
              <UnitSelect value={unit} onValueChange={setUnit} label="Unit" required />
              {isFieldVisible(schemaFields, "sku") && (
                <FormField
                  id="raw-sku"
                  label="SKU"
                  value={String(values.sku || "")}
                  onChange={(e) => updateField("sku", e.target.value)}
                  required
                />
              )}
              {isFieldVisible(schemaFields, "barcode") && (
                <FormField
                  id="raw-barcode"
                  label="Barcode"
                  value={String(values.barcode || "")}
                  onChange={(e) => updateField("barcode", e.target.value)}
                />
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select a business to continue.</p>
          )}

          <div className="space-y-3">
            <Button
              type="button"
              variant="ghost"
              className="h-auto px-0 text-sm text-muted-foreground"
              onClick={() => setShowPackaging((open) => !open)}
            >
              {showPackaging ? "Hide packaging" : "More options"}
            </Button>
            {showPackaging ? (
              <div className="rounded-lg border border-border p-4">
                <PackagingsEditor
                  baseUnit={unit}
                  value={packagings}
                  onChange={setPackagings}
                />
              </div>
            ) : null}
          </div>

          {schemaFields.some((field) => !isEntityRootKey("product", field.key) && field.visible) && (
            <div className="grid gap-4 sm:grid-cols-2">
              <DynamicEntityFields
                fields={schemaFields.filter((field) => !isEntityRootKey("product", field.key))}
                values={values}
                onChange={updateField}
                idPrefix="raw-custom"
              />
            </div>
          )}
        </CrudDialog>
      </PageShell>
    </RequirePermission>
  );
}
