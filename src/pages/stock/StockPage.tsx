import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { DynamicEntityFields } from "@/components/entity-fields/DynamicEntityFields";
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
  PermissionButton,
  textColumn,
} from "@/components/shared";
import { ImportWizard } from "@/components/import/ImportWizard";
import { STOCK_IMPORT_FIELDS } from "@/components/import/importFields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { EnumSelect } from "@/components/shared/EnumSelect";
import { useBusinessOptions, useBusinessVisibility } from "@/hooks/useBusinessOptions";
import { resolveListBusinessId, useListSchemaFields } from "@/hooks/useListSchemaFields";
import { useCategoryOptions } from "@/hooks/useCategoryOptions";
import { useCrudPage } from "@/hooks/useCrudPage";
import { useListQuery } from "@/hooks/useListQuery";
import { getBusinessDisplayName } from "@/lib/business";
import { buildEntityPayload, formatCustomListValue } from "@/constants/entityFields";
import { ALL_FILTER, STATUS_FILTER_OPTIONS, STOCK_LEVEL_FILTER_OPTIONS } from "@/lib/listFilters";
import { MODULE_PATHS } from "@/lib/modulePaths";
import {
  PRODUCT_UNIT_LABELS,
  normalizeProductUnit,
} from "@/constants/catalog";
import { formatStockBreakdown } from "@/lib/stockDisplay";
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

function stockBaseUnit(stock: StockRecord) {
  if (typeof stock.product === "object" && stock.product?.unit) return stock.product.unit;
  return stock.unit || "piece";
}

function formatOnHand(stock: StockRecord) {
  const packagings =
    stock.packagings ||
    (typeof stock.product === "object" && stock.product ? stock.product.packagings : []) ||
    [];
  return formatStockBreakdown(Number(stock.quantity) || 0, stockBaseUnit(stock), packagings);
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
  const navigate = useNavigate();
  const { isSuperAdmin, showBusinessColumn, singleAssignedBusiness } = useBusinessVisibility();
  const crud = useCrudPage<StockRecord>();
  const list = useListQuery();
  const [items, setItems] = useState<StockRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [formValues, setFormValues] = useState<Record<string, unknown>>(stockFormValues());
  const [schemaFields, setSchemaFields] = useState<EntityFieldDefinition[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [receiveQty, setReceiveQty] = useState("1");
  const [receiveUnit, setReceiveUnit] = useState("");
  const [receiving, setReceiving] = useState(false);
  /** Cross-page selection: keep row snapshots so Update stock can open instantly. */
  const [selectedMap, setSelectedMap] = useState<Map<string, StockRecord>>(() => new Map());
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
  const selectedCount = selectedMap.size;
  const pageIds = useMemo(() => items.map((row) => row._id), [items]);
  const pageSelectedCount = useMemo(
    () => pageIds.filter((id) => selectedMap.has(id)).length,
    [pageIds, selectedMap]
  );
  const pageAllSelected = pageIds.length > 0 && pageSelectedCount === pageIds.length;
  const pageSomeSelected = pageSelectedCount > 0 && !pageAllSelected;

  // Refresh snapshots when the current page reloads (qty/price may have changed).
  useEffect(() => {
    if (!selectedMap.size || !items.length) return;
    setSelectedMap((current) => {
      let changed = false;
      const next = new Map(current);
      for (const row of items) {
        if (!next.has(row._id)) continue;
        next.set(row._id, row);
        changed = true;
      }
      return changed ? next : current;
    });
  }, [items]);

  function toggleRow(row: StockRecord, checked: boolean) {
    setSelectedMap((current) => {
      const next = new Map(current);
      if (checked) next.set(row._id, row);
      else next.delete(row._id);
      return next;
    });
  }

  function togglePage(checked: boolean) {
    setSelectedMap((current) => {
      const next = new Map(current);
      for (const row of items) {
        if (checked) next.set(row._id, row);
        else next.delete(row._id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedMap(new Map());
  }

  function selectedPayloadOrError() {
    if (selectedCount === 0) return { kind: "empty" as const };
    const selected = [...selectedMap.values()];
    const businessIds = [
      ...new Set(selected.map((row) => stockBusinessId(row)).filter(Boolean)),
    ];
    if (businessIds.length > 1) {
      crud.setError(
        "Selected items must be from one business. Clear the selection or filter by business."
      );
      return { kind: "error" as const };
    }
    return {
      kind: "ok" as const,
      payload: {
        businessId:
          businessIds[0] ||
          listBusinessId ||
          stockBusinessId(selected[0]) ||
          "",
        items: selected,
      },
    };
  }

  function goToBulkUpdate() {
    const result = selectedPayloadOrError();
    if (result.kind === "error") return;
    if (result.kind === "empty") {
      navigate(`${MODULE_PATH}/update`);
      return;
    }
    try {
      sessionStorage.setItem("stock-update-prefill", JSON.stringify(result.payload));
    } catch {
      /* ignore quota / private mode */
    }
    navigate(`${MODULE_PATH}/update`, { state: result.payload });
    clearSelection();
  }

  function goToStockRequest() {
    const result = selectedPayloadOrError();
    if (result.kind === "error") return;
    if (result.kind === "empty") {
      navigate(`${MODULE_PATH}/request`);
      return;
    }
    try {
      sessionStorage.setItem("stock-request-prefill", JSON.stringify(result.payload));
    } catch {
      /* ignore quota / private mode */
    }
    navigate(`${MODULE_PATH}/request`, { state: result.payload });
    clearSelection();
  }

  const columns = useMemo(
    () => [
      {
        id: "select",
        header: (
          <Checkbox
            checked={pageAllSelected}
            indeterminate={pageSomeSelected}
            aria-label="Select all on this page"
            onCheckedChange={(value) => togglePage(value === true)}
          />
        ),
        headerClassName: "w-10 pr-0",
        cellClassName: "w-10 pr-0",
        mobile: { role: "badge" as const },
        cell: (row: StockRecord) => (
          <Checkbox
            checked={selectedMap.has(row._id)}
            aria-label={`Select ${stockProductName(row)}`}
            onCheckedChange={(value) => toggleRow(row, value === true)}
            onClick={(event) => event.stopPropagation()}
          />
        ),
      },
      textColumn<StockRecord>("product", "Product", stockProductName, { primary: true }),
      textColumn<StockRecord>("variation", "Variation", stockVariationName),
      textColumn<StockRecord>("sku", "SKU", (row) => row.sku),
      textColumn<StockRecord>("quantity", "On hand", (row) => formatOnHand(row)),
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
    [listCustomFields, showBusinessColumn, selectedMap, pageAllSelected, pageSomeSelected, items]
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
    const base = normalizeProductUnit(stockBaseUnit(stock));
    const packagings =
      stock.packagings ||
      (typeof stock.product === "object" && stock.product
        ? stock.product.packagings
        : []) ||
      [];
    const firstPack = packagings.find((row) => {
      const unit = normalizeProductUnit(row.unit || "");
      return Boolean(unit) && unit !== base && Number(row.factorToBase) > 0;
    });
    setReceiveQty("1");
    setReceiveUnit(firstPack?.unit ? normalizeProductUnit(firstPack.unit) : base);
  }

  async function handleReceive() {
    if (!crud.editing) return;
    const qty = Number(receiveQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      crud.setError("Enter a receive quantity greater than zero.");
      return;
    }
    setReceiving(true);
    try {
      const updated = await api.receiveStock(crud.editing._id, {
        quantity: qty,
        packagingUnit: receiveUnit,
      });
      crud.setEditing(updated);
      setFormValues(stockFormValues(updated));
      setReceiveQty("1");
      crud.setMessage("Stock received.");
      await loadStock();
    } catch (error) {
      crud.setError(error instanceof Error ? error.message : "Unable to receive stock.");
    } finally {
      setReceiving(false);
    }
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
          headerActions={
            <>
              <PermissionButton
                modulePath={MODULE_PATH}
                action="create"
                variant="outline"
                onClick={() => setImportOpen(true)}
              >
                Import
              </PermissionButton>
              <PermissionButton
                modulePath={MODULE_PATH}
                action="update"
                onClick={goToBulkUpdate}
              >
                {selectedCount > 0
                  ? `Update stock (${selectedCount} selected)`
                  : "Update stock"}
              </PermissionButton>
              <PermissionButton
                modulePath={MODULE_PATH}
                action="view"
                onClick={goToStockRequest}
              >
                {selectedCount > 0
                  ? `Request stock (${selectedCount} selected)`
                  : "Request stock"}
              </PermissionButton>
              <PermissionButton
                modulePath={MODULE_PATH}
                action="view"
                variant="outline"
                onClick={() =>
                  navigate(
                    listBusinessId && listBusinessId !== ALL_FILTER
                      ? `${MODULE_PATH}/updates?businessId=${encodeURIComponent(listBusinessId)}`
                      : `${MODULE_PATH}/updates`
                  )
                }
              >
                Update history
              </PermissionButton>
            </>
          }
          filters={
            <ListFilters
              search={list.searchInput}
              onSearchChange={list.setSearchInput}
              searchPlaceholder="Search products..."
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
              selectedCount={selectedCount}
              onClearSelection={selectedCount > 0 ? clearSelection : undefined}
            />
          }
        />

        <ImportWizard
          open={importOpen}
          onOpenChange={setImportOpen}
          title="Import stock"
          fields={STOCK_IMPORT_FIELDS}
          businessScope={isSuperAdmin ? "all" : "assigned"}
          editablePreview
          onImport={(payload) => api.importStock(payload)}
          onFinished={() => {
            void loadStock();
            crud.setMessage("Stock import finished.");
          }}
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
                <p className="text-muted-foreground mt-1 text-sm">
                  On hand: {formatOnHand(crud.editing)}
                </p>
              </div>

              <div className="space-y-3 sm:col-span-2">
                <p className="text-sm font-medium">Receive stock</p>
                <p className="text-muted-foreground text-xs">
                  Enter packs/boxes received — quantity is converted into the base unit automatically.
                </p>
                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <FormField
                    id="stock-receive-qty"
                    label="Quantity"
                    type="number"
                    min={0.000001}
                    step="any"
                    value={receiveQty}
                    onChange={(event) => setReceiveQty(event.target.value)}
                  />
                  <EnumSelect
                    id="stock-receive-unit"
                    label="Unit"
                    value={receiveUnit || stockBaseUnit(crud.editing)}
                    onValueChange={setReceiveUnit}
                    options={(
                      crud.editing.sellUnits?.length
                        ? crud.editing.sellUnits
                        : [{ unit: stockBaseUnit(crud.editing), factorToBase: 1 }]
                    ).map((row) => ({
                      value: row.unit,
                      label:
                        PRODUCT_UNIT_LABELS[normalizeProductUnit(row.unit)] ||
                        row.unit,
                    }))}
                  />
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={receiving}
                      onClick={() => void handleReceive()}
                    >
                      {receiving ? "Receiving…" : "Receive"}
                    </Button>
                  </div>
                </div>
              </div>

              <Separator className="sm:col-span-2" />

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
