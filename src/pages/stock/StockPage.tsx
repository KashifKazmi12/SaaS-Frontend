import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { DynamicEntityFields } from "@/components/entity-fields/DynamicEntityFields";
import { PageShell } from "@/components/layout/PageShell";
import { RequirePermission } from "@/components/layout/RouteGuards";
import {
  CrudDialog,
  DataTableCard,
  FilterSelect,
  ListFilters,
  ListPagination,
  PageAlerts,
  textColumn,
} from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { useBusinessOptions, useBusinessVisibility } from "@/hooks/useBusinessOptions";
import { resolveListBusinessId, useListSchemaFields } from "@/hooks/useListSchemaFields";
import { useCategoryOptions } from "@/hooks/useCategoryOptions";
import { useCrudPage } from "@/hooks/useCrudPage";
import { useListQuery } from "@/hooks/useListQuery";
import { getBusinessDisplayName } from "@/lib/business";
import { buildEntityPayload, formatCustomListValue } from "@/constants/entityFields";
import { ALL_FILTER, STATUS_FILTER_OPTIONS, STOCK_LEVEL_FILTER_OPTIONS } from "@/lib/listFilters";
import { MODULE_PATHS } from "@/lib/modulePaths";
import type { EntityFieldDefinition, StockLevel, StockRecord } from "@/types";

const MODULE_PATH = MODULE_PATHS.STOCK;

const STOCK_LEVEL_LABELS: Record<StockLevel, string> = {
  in: "In stock",
  low: "Low stock",
  out: "Out of stock",
};

function formatQuantity(value: unknown) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "—";
  return String(amount);
}

function stockProductName(stock: StockRecord) {
  return typeof stock.product === "object" && stock.product ? stock.product.name : "—";
}

function stockVariationName(stock: StockRecord) {
  return stock.variation?.name || "—";
}

function stockBusinessId(stock: StockRecord) {
  return typeof stock.business === "object" && stock.business
    ? stock.business._id
    : typeof stock.business === "string"
      ? stock.business
      : "";
}

function stockFormValues(stock?: StockRecord): Record<string, unknown> {
  if (!stock) return { quantity: 0, minStock: 0 };
  return {
    quantity: stock.quantity ?? 0,
    minStock: stock.minStock ?? 0,
    ...(stock.custom || {}),
  };
}

function StockLevelBadge({ level }: { level: StockLevel }) {
  const variant = level === "out" ? "destructive" : level === "low" ? "secondary" : "default";
  return <Badge variant={variant}>{STOCK_LEVEL_LABELS[level]}</Badge>;
}

export default function StockPage() {
  const { isSuperAdmin, showBusinessColumn, singleAssignedBusiness } = useBusinessVisibility();
  const crud = useCrudPage<StockRecord>();
  const list = useListQuery();
  const [items, setItems] = useState<StockRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [formValues, setFormValues] = useState<Record<string, unknown>>(stockFormValues());
  const [schemaFields, setSchemaFields] = useState<EntityFieldDefinition[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const { options: businessOptions } = useBusinessOptions(isSuperAdmin ? "all" : "assigned");
  const listBusinessId = resolveListBusinessId(
    list.getFilter("businessId"),
    singleAssignedBusiness?.id
  );
  const listCustomFields = useListSchemaFields("stock", listBusinessId);
  const filterBusinessId = list.getFilter("businessId");
  const { options: categoryOptions } = useCategoryOptions(
    filterBusinessId === ALL_FILTER ? undefined : filterBusinessId
  );
  const editingBusinessId = crud.editing ? stockBusinessId(crud.editing) : "";

  const columns = useMemo(
    () => [
      textColumn<StockRecord>("product", "Product", stockProductName, { primary: true }),
      textColumn<StockRecord>("variation", "Variation", stockVariationName),
      textColumn<StockRecord>("sku", "SKU", (row) => row.sku),
      textColumn<StockRecord>("quantity", "Quantity", (row) => formatQuantity(row.quantity)),
      textColumn<StockRecord>("minStock", "Min stock", (row) => formatQuantity(row.minStock)),
      textColumn<StockRecord>(
        "business",
        "Business",
        (row) => getBusinessDisplayName(row.business),
        { hidden: !showBusinessColumn }
      ),
      ...listCustomFields.map((field) =>
        textColumn<StockRecord>(
          `custom-${field.key}`,
          field.label,
          (row) => formatCustomListValue(row.custom?.[field.key], field)
        )
      ),
      {
        id: "stockLevel",
        header: "Stock",
        cell: (row: StockRecord) => <StockLevelBadge level={row.stockLevel} />,
      },
    ],
    [listCustomFields, showBusinessColumn]
  );

  async function loadStock() {
    await crud.runLoad(async () => {
      const data = await api.getStock(list.params);
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      if (data.items.length === 0 && data.total > 0 && list.page > 1) {
        list.setPage(Math.max(1, data.totalPages));
      }
    }, "Unable to load stock.");
  }

  useEffect(() => {
    loadStock();
  }, [list.params]);

  useEffect(() => {
    if (!crud.dialogOpen || !editingBusinessId) {
      setSchemaFields([]);
      return;
    }

    let cancelled = false;
    setSchemaLoading(true);
    api
      .getStockSchema(editingBusinessId)
      .then((data) => {
        if (!cancelled) setSchemaFields(data.fields);
      })
      .catch((err) => {
        if (!cancelled) {
          crud.setError(err instanceof Error ? err.message : "Unable to load stock fields.");
          setSchemaFields([]);
        }
      })
      .finally(() => {
        if (!cancelled) setSchemaLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [editingBusinessId, crud.dialogOpen]);

  function populateForm(stock: StockRecord) {
    setFormValues(stockFormValues(stock));
  }

  function updateField(key: string, value: unknown) {
    setFormValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!crud.editing) return;

    if (schemaLoading || schemaFields.length === 0) {
      crud.setError("Stock fields are still loading.");
      return;
    }

    const payload = buildEntityPayload("stock", formValues, schemaFields);
    await crud.runMutation(
      async () => {
        await api.updateStock(crud.editing!._id, payload);
      },
      {
        successMessage: "Stock updated.",
        reload: loadStock,
        fallbackError: "Unable to update stock.",
      }
    );
  }

  return (
    <RequirePermission path={MODULE_PATH} action="view">
      <PageShell description="Track quantity for each product and variation.">
        <PageAlerts error={crud.error} message={crud.message} />

        <DataTableCard
          title="Stock"
          modulePath={MODULE_PATH}
          columns={columns}
          data={items}
          getRowId={(row) => row._id}
          rowActions={{
            modulePath: MODULE_PATH,
            onEdit: (row) => crud.startEdit(row, populateForm),
          }}
          loading={crud.loading}
          loadingMessage="Loading stock..."
          empty={!crud.loading && items.length === 0}
          emptyMessage={
            list.activeCount > 0 ? "No stock matches your filters." : "No products to track yet."
          }
          filters={
            <ListFilters
              search={list.searchInput}
              onSearchChange={list.setSearchInput}
              searchPlaceholder="Search products or SKUs..."
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
                value={list.getFilter("categoryId")}
                onValueChange={(value) => list.setFilter("categoryId", value)}
                options={[
                  { value: ALL_FILTER, label: "All categories" },
                  ...categoryOptions.map((option) => ({
                    value: option.id,
                    label: option.name,
                  })),
                ]}
              />
              <FilterSelect
                value={list.getFilter("stockLevel")}
                onValueChange={(value) => list.setFilter("stockLevel", value)}
                options={STOCK_LEVEL_FILTER_OPTIONS}
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
        />

        <CrudDialog
          open={crud.dialogOpen}
          onOpenChange={crud.setDialogOpen}
          editing
          createTitle="Update stock"
          editTitle="Update stock"
          editSubmitLabel="Save stock"
          onSubmit={handleSubmit}
          className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        >
          {crud.editing && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <p className="font-medium">{stockProductName(crud.editing)}</p>
                <p className="text-muted-foreground text-sm">
                  {[crud.editing.variation?.name, crud.editing.sku].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>

              {schemaLoading ? (
                <p className="text-muted-foreground text-sm sm:col-span-2">Loading fields...</p>
              ) : schemaFields.length > 0 ? (
                <DynamicEntityFields
                  fields={schemaFields}
                  values={formValues}
                  onChange={updateField}
                  idPrefix="stock"
                />
              ) : (
                <p className="text-muted-foreground text-sm sm:col-span-2">
                  Unable to load stock fields.
                </p>
              )}
            </div>
          )}
        </CrudDialog>
      </PageShell>
    </RequirePermission>
  );
}
