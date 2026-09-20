import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { BusinessSelect } from "@/components/business";
import { DynamicEntityFields } from "@/components/entity-fields/DynamicEntityFields";
import {
  CategorySelect,
  createEmptyVariation,
  ProductVariationsDialog,
  ProductVariationsEditor,
  UnitSelect,
} from "@/components/catalog";
import { PageShell } from "@/components/layout/PageShell";
import { RequirePermission } from "@/components/layout/RouteGuards";
import {
  CrudDialog,
  DataTableCard,
  FileUploadField,
  FilterSelect,
  FormCheckboxField,
  FormField,
  ListFilters,
  ListPagination,
  PageAlerts,
  PermissionButton,
  PermissionIconButton,
  imageColumn,
  statusColumn,
  textColumn,
} from "@/components/shared";
import { Layers } from "lucide-react";
import { useBusinessOptions, useBusinessVisibility } from "@/hooks/useBusinessOptions";
import { resolveListBusinessId, useListSchemaFields } from "@/hooks/useListSchemaFields";
import { useCategoryOptions } from "@/hooks/useCategoryOptions";
import { useCrudPage } from "@/hooks/useCrudPage";
import { useListQuery } from "@/hooks/useListQuery";
import {
  getBusinessDisplayName,
  shouldSendBusinessIdOnCreate,
} from "@/lib/business";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MODULE_PATHS } from "@/lib/modulePaths";
import { currencyFromBusiness, formatMoney } from "@/lib/money";
import {
  PRODUCT_UNIT_LABELS,
  normalizeProductUnit,
  type ProductUnit,
} from "@/constants/catalog";
import { normalizeVariationOptionType } from "@/constants/catalog";
import {
  buildEntityPayload,
  formatCustomListValue,
  isEntityRootKey,
  isFieldVisible,
} from "@/constants/entityFields";
import type {
  EntityFieldDefinition,
  ProductRecord,
  ProductVariationRecord,
  VariationDraft,
} from "@/types";
import type { ProductImage } from "@/lib/media";
import { ALL_FILTER, STATUS_FILTER_OPTIONS } from "@/lib/listFilters";
import { getFeaturedImagePath, normalizeProductImages, resolveMediaUrl } from "@/lib/media";

const MODULE_PATH = MODULE_PATHS.CATALOG_PRODUCTS;

function productFormValues(product?: ProductRecord): Record<string, unknown> {
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
    ...(product.custom || {}),
  };
}

function getCategoryName(category: ProductRecord["category"]) {
  if (!category) return "—";
  if (typeof category === "object") return category.name;
  return "—";
}

function variationToDraft(variation: ProductVariationRecord): VariationDraft {
  return {
    _id: variation._id,
    name: variation.name,
    sku: variation.sku,
    barcode: variation.barcode,
    price: String(variation.price),
    costPrice: String(variation.costPrice),
    isActive: variation.isActive,
    options: variation.options.length
      ? variation.options.map((option) => ({
          name: normalizeVariationOptionType(option.name) || option.name,
          value: option.value,
        }))
      : [{ name: "Color", value: "" }],
  };
}

function draftToPayload(draft: VariationDraft) {
  return {
    name: draft.name.trim(),
    sku: draft.sku.trim(),
    barcode: draft.barcode.trim(),
    price: Number(draft.price) || 0,
    costPrice: Number(draft.costPrice) || 0,
    isActive: draft.isActive,
    options: draft.options.filter((option) => option.name.trim() && option.value.trim()),
  };
}

export default function ProductsPage() {
  const { user } = useAuth();
  const { isSuperAdmin, showBusinessColumn, singleAssignedBusiness } = useBusinessVisibility();
  const crud = useCrudPage<ProductRecord>();
  const list = useListQuery();
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [formValues, setFormValues] = useState<Record<string, unknown>>(productFormValues());
  const [schemaFields, setSchemaFields] = useState<EntityFieldDefinition[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [unit, setUnit] = useState<ProductUnit>("piece");
  const [images, setImages] = useState<ProductImage[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [hasVariations, setHasVariations] = useState(false);
  const [variations, setVariations] = useState<VariationDraft[]>([]);
  const [deletedVariationIds, setDeletedVariationIds] = useState<string[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [variationsDialogOpen, setVariationsDialogOpen] = useState(false);
  const [variationsProduct, setVariationsProduct] = useState<ProductRecord | null>(null);
  const { options: businessOptions } = useBusinessOptions(isSuperAdmin ? "all" : "assigned");
  const filterBusinessId = list.getFilter("businessId");
  const listBusinessId = resolveListBusinessId(filterBusinessId, singleAssignedBusiness?.id);
  const listCustomFields = useListSchemaFields("product", listBusinessId);
  const { options: categoryOptions } = useCategoryOptions(
    filterBusinessId === ALL_FILTER ? undefined : filterBusinessId
  );

  function openVariationsDialog(product: ProductRecord) {
    setVariationsProduct(product);
    setVariationsDialogOpen(true);
  }

  const columns = useMemo(
    () => [
      imageColumn<ProductRecord>(
        "image",
        "Image",
        (product) => {
          const path = getFeaturedImagePath(normalizeProductImages(product.images));
          return path ? resolveMediaUrl(path) : "";
        },
        { alt: (product) => product.name }
      ),
      textColumn<ProductRecord>("name", "Name", (product) => product.name, { primary: true }),
      textColumn<ProductRecord>(
        "business",
        "Business",
        (product) => getBusinessDisplayName(product.business),
        { hidden: !showBusinessColumn }
      ),
      textColumn<ProductRecord>("category", "Category", (product) => getCategoryName(product.category)),
      textColumn<ProductRecord>("sku", "SKU / Variants", (product) =>
        product.hasVariations ? (
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-primary"
            onClick={() => openVariationsDialog(product)}
          >
            {product.variationCount ?? 0} variations
          </Button>
        ) : (
          product.sku || "—"
        )
      ),
      textColumn<ProductRecord>("barcode", "Barcode", (product) =>
        product.hasVariations ? "—" : product.barcode || "—"
      ),
      textColumn<ProductRecord>("basePrice", "Price", (product) =>
        formatMoney(product.basePrice, currencyFromBusiness(product.business))
      ),
      textColumn<ProductRecord>("unit", "Unit", (product) =>
        PRODUCT_UNIT_LABELS[normalizeProductUnit(product.unit)] || product.unit
      ),
      ...listCustomFields.map((field) =>
        textColumn<ProductRecord>(
          `custom-${field.key}`,
          field.label,
          (product) => formatCustomListValue(product.custom?.[field.key], field)
        )
      ),
      statusColumn<ProductRecord>(),
    ],
    [listCustomFields, showBusinessColumn]
  );

  async function loadProducts() {
    await crud.runLoad(async () => {
      const data = await api.getProducts(list.params);
      setProducts(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      if (data.items.length === 0 && data.total > 0 && list.page > 1) {
        list.setPage(Math.max(1, data.totalPages));
      }
    }, "Unable to load products.");
  }

  useEffect(() => {
    loadProducts();
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
          crud.setError(err instanceof Error ? err.message : "Unable to load product fields.");
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
    const defaultBusiness = user?.businesses?.[0]?.id || "";
    setFormValues(productFormValues());
    setUnit("piece");
    setImages([]);
    setCategoryId("");
    setBusinessId(defaultBusiness);
    setHasVariations(false);
    setVariations([]);
    setDeletedVariationIds([]);
  }

  async function populateForm(product: ProductRecord) {
    setFormValues(productFormValues(product));
    setUnit(normalizeProductUnit(product.unit || "piece"));
    setImages(normalizeProductImages(product.images));
    setCategoryId(
      typeof product.category === "object" && product.category ? product.category._id : ""
    );
    setBusinessId(
      typeof product.business === "object" && product.business
        ? product.business._id
        : typeof product.business === "string"
          ? product.business
          : ""
    );
    setHasVariations(product.hasVariations);
    setDeletedVariationIds([]);
    setLoadingDetail(true);

    try {
      const detail = await api.getProduct(product._id);
      setHasVariations(detail.product.hasVariations);
      setVariations(detail.variations.map(variationToDraft));
    } catch {
      setVariations([]);
    } finally {
      setLoadingDetail(false);
    }
  }

  function handleHasVariationsChange(next: boolean) {
    setHasVariations(next);
    if (next) {
      updateField("sku", "");
      updateField("barcode", "");
      if (variations.length === 0) {
        setVariations([createEmptyVariation(String(formValues.basePrice || "0"))]);
      }
    }
  }

  async function syncVariations(productId: string) {
    for (const variationId of deletedVariationIds) {
      await api.deleteProductVariation(productId, variationId);
    }

    for (const draft of variations) {
      const payload = draftToPayload(draft);
      if (draft._id) {
        await api.updateProductVariation(productId, draft._id, payload);
      } else {
        await api.createProductVariation(productId, payload);
      }
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (schemaLoading || schemaFields.length === 0) {
      crud.setError("Product fields are still loading.");
      return;
    }

    if (images.length === 0) {
      crud.setError("At least one product image is required.");
      return;
    }

    const payload = buildEntityPayload("product", { ...formValues, unit }, schemaFields);
    payload.unit = unit;
    payload.images = images;
    payload.categoryId = categoryId || null;
    payload.hasVariations = hasVariations;

    if (hasVariations) {
      delete payload.sku;
      delete payload.barcode;
    }

    if (!crud.editing && shouldSendBusinessIdOnCreate(user)) {
      payload.businessId = businessId;
    }

    if (!crud.editing && hasVariations) {
      payload.variations = variations.map(draftToPayload);
    }

    await crud.runMutation(
      async () => {
        if (crud.editing) {
          await api.updateProduct(crud.editing._id, payload);
          if (hasVariations || crud.editing.hasVariations) {
            await syncVariations(crud.editing._id);
          }
        } else {
          await api.createProduct(payload);
        }
      },
      {
        successMessage: crud.editing ? "Product updated." : "Product added.",
        reload: loadProducts,
        fallbackError: "Unable to save product.",
      }
    );
  }

  async function handleDelete(product: ProductRecord) {
    await crud.runDelete(
      product.name,
      async () => {
        await api.deleteProduct(product._id);
      },
      {
        successMessage: "Product removed.",
        reload: loadProducts,
        fallbackError: "Unable to remove product.",
      }
    );
  }

  async function handleExport() {
    const data = await api.getProducts({ ...list.params, page: 1, limit: 100 });
    const rows = data.items.map((item) => ({
      name: item.name,
      description: item.description,
      basePrice: item.basePrice,
      costPrice: item.costPrice,
      sku: item.hasVariations ? "—" : item.sku,
      barcode: item.hasVariations ? "—" : item.barcode,
      unit: item.unit,
      category: getCategoryName(item.category),
      business: getBusinessDisplayName(item.business),
      variations: item.hasVariations ? item.variationCount ?? 0 : 0,
      status: item.isActive ? "Active" : "Inactive",
    }));

    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "products.json";
    link.click();
    URL.revokeObjectURL(url);
    crud.setMessage("Products exported.");
  }

  function updateVariations(next: VariationDraft[]) {
    const nextIds = new Set(next.map((row) => row._id).filter(Boolean));
    const removedIds = variations
      .filter((row) => row._id && !nextIds.has(row._id))
      .map((row) => row._id as string);

    if (removedIds.length > 0) {
      setDeletedVariationIds((current) => [...current, ...removedIds]);
    }

    setVariations(next);
  }

  return (
    <RequirePermission path={MODULE_PATH} action="view">
      <PageShell description="Manage catalog products with categories, SKUs, barcodes, and optional variations.">
        <PageAlerts error={crud.error} message={crud.message} />

        <DataTableCard
          title="Product list"
          modulePath={MODULE_PATH}
          columns={columns}
          data={products}
          getRowId={(product) => product._id}
          rowActions={{
            modulePath: MODULE_PATH,
            onEdit: (product) => crud.startEdit(product, populateForm),
            onDelete: handleDelete,
            extraActions: (product) => (
              <PermissionIconButton
                modulePath={MODULE_PATH}
                action="view"
                variant="outline"
                size="icon-sm"
                label={
                  product.hasVariations ? "Variations" : "Add variations"
                }
                icon={<Layers className="size-3.5" />}
                onClick={() => openVariationsDialog(product)}
              />
            ),
          }}
          loading={crud.loading}
          loadingMessage="Loading products..."
          empty={!crud.loading && products.length === 0}
          emptyMessage={
            list.activeCount > 0 ? "No products match your filters." : "No products yet."
          }
          filters={
            <ListFilters
              search={list.searchInput}
              onSearchChange={list.setSearchInput}
              searchPlaceholder="Search name, SKU, or barcode..."
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
                value={list.getFilter("hasVariations")}
                onValueChange={(value) => list.setFilter("hasVariations", value)}
                options={[
                  { value: ALL_FILTER, label: "All types" },
                  { value: "no", label: "Simple" },
                  { value: "yes", label: "With variations" },
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
          createLabel="Add product"
          onCreate={() => crud.startCreate(resetForm)}
          headerActions={
            <PermissionButton modulePath={MODULE_PATH} action="export" variant="outline" onClick={handleExport}>
              Export
            </PermissionButton>
          }
        />

        <CrudDialog
          open={crud.dialogOpen}
          onOpenChange={crud.setDialogOpen}
          editing={Boolean(crud.editing)}
          createTitle="Add product"
          editTitle="Edit product"
          createSubmitLabel="Create product"
          onSubmit={handleSubmit}
          className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        >
          <BusinessSelect
            scope={isSuperAdmin ? "all" : "assigned"}
            value={businessId}
            onValueChange={(value) => {
              setBusinessId(value);
              setCategoryId("");
            }}
            readOnly={Boolean(crud.editing)}
            required={!crud.editing}
          />

          <CategorySelect
            businessId={businessId}
            value={categoryId}
            onValueChange={setCategoryId}
          />

          {schemaLoading ? (
            <p className="text-sm text-muted-foreground">Loading fields...</p>
          ) : businessId && schemaFields.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <DynamicEntityFields
                fields={schemaFields.filter((field) =>
                  ["name", "description", "basePrice", "costPrice"].includes(field.key)
                )}
                values={formValues}
                onChange={updateField}
                idPrefix="product"
              />
              <UnitSelect value={unit} onValueChange={setUnit} required />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select a business to see its product fields.</p>
          )}

          <FileUploadField
            id="product-images"
            label="Product images"
            mode="multiple"
            folder="products"
            value={images}
            onChange={setImages}
            maxFiles={8}
            required
            recommendedSize={{
              width: 800,
              height: 800,
              tip: "Images near this square size display best. Previews use cover crop — very wide or tall photos may be cropped on the sides or top/bottom. Star one image as featured.",
            }}
          />

          <FormCheckboxField
            label="This product has variations (size, color, etc.)"
            checked={hasVariations}
            onCheckedChange={handleHasVariationsChange}
          />

          {hasVariations && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-sm font-medium">Product variations</p>
                <p className="text-xs text-muted-foreground">
                  Each variation needs a name, SKU, and barcode. Use options for color, size, or other
                  attributes.
                </p>
              </div>
            </>
          )}

          {!hasVariations ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {isFieldVisible(schemaFields, "sku") && (
                <FormField
                  id="product-sku"
                  label="SKU"
                  value={String(formValues.sku || "")}
                  onChange={(e) => updateField("sku", e.target.value)}
                  required
                />
              )}
              {isFieldVisible(schemaFields, "barcode") && (
                <FormField
                  id="product-barcode"
                  label="Barcode"
                  value={String(formValues.barcode || "")}
                  onChange={(e) => updateField("barcode", e.target.value)}
                />
              )}
            </div>
          ) : loadingDetail && crud.editing ? (
            <p className="text-sm text-muted-foreground">Loading variations...</p>
          ) : (
            <ProductVariationsEditor
              variations={variations}
              onChange={crud.editing ? updateVariations : setVariations}
              disabled={loadingDetail}
            />
          )}

          {schemaFields.some((field) => !isEntityRootKey("product", field.key) && field.visible) && (
            <div className="grid gap-4 sm:grid-cols-2">
              <DynamicEntityFields
                fields={schemaFields.filter((field) => !isEntityRootKey("product", field.key))}
                values={formValues}
                onChange={updateField}
                idPrefix="product-custom"
              />
            </div>
          )}
        </CrudDialog>

        <ProductVariationsDialog
          open={variationsDialogOpen}
          onOpenChange={setVariationsDialogOpen}
          productId={variationsProduct?._id ?? null}
          productName={variationsProduct?.name ?? "Product"}
          currency={currencyFromBusiness(variationsProduct?.business)}
          onUpdated={loadProducts}
        />
      </PageShell>
    </RequirePermission>
  );
}
