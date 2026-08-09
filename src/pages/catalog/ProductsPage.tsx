import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { BusinessSelect } from "@/components/business";
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
  FormCheckboxField,
  FormField,
  PageAlerts,
  PermissionButton,
  PermissionIconButton,
  statusColumn,
  textColumn,
} from "@/components/shared";
import { Layers } from "lucide-react";
import { useBusinessVisibility } from "@/hooks/useBusinessOptions";
import { useCrudPage } from "@/hooks/useCrudPage";
import {
  getBusinessDisplayName,
  shouldSendBusinessIdOnCreate,
} from "@/lib/business";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MODULE_PATHS } from "@/lib/modulePaths";
import {
  PRODUCT_UNIT_LABELS,
  normalizeProductUnit,
  type ProductUnit,
} from "@/constants/catalog";
import { normalizeVariationOptionType } from "@/constants/catalog";
import type { ProductRecord, ProductVariationRecord, VariationDraft } from "@/types";
import type { ProductImage } from "@/lib/media";
import { normalizeProductImages } from "@/lib/media";

const MODULE_PATH = MODULE_PATHS.CATALOG_PRODUCTS;

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
  const { isSuperAdmin, showBusinessColumn } = useBusinessVisibility();
  const crud = useCrudPage<ProductRecord>();
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("0");
  const [costPrice, setCostPrice] = useState("0");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
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

  function openVariationsDialog(product: ProductRecord) {
    setVariationsProduct(product);
    setVariationsDialogOpen(true);
  }

  const columns = useMemo(
    () => [
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
      textColumn<ProductRecord>("basePrice", "Price", (product) => `$${product.basePrice.toFixed(2)}`),
      textColumn<ProductRecord>("unit", "Unit", (product) =>
        PRODUCT_UNIT_LABELS[normalizeProductUnit(product.unit)] || product.unit
      ),
      statusColumn<ProductRecord>(),
    ],
    [showBusinessColumn]
  );

  async function loadProducts() {
    await crud.runLoad(async () => {
      const data = await api.getProducts();
      setProducts(data);
    }, "Unable to load products.");
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function resetForm() {
    const defaultBusiness = user?.businesses?.[0]?.id || "";
    setName("");
    setDescription("");
    setBasePrice("0");
    setCostPrice("0");
    setSku("");
    setBarcode("");
    setUnit("piece");
    setImages([]);
    setCategoryId("");
    setBusinessId(defaultBusiness);
    setHasVariations(false);
    setVariations([]);
    setDeletedVariationIds([]);
  }

  async function populateForm(product: ProductRecord) {
    setName(product.name);
    setDescription(product.description);
    setBasePrice(String(product.basePrice));
    setCostPrice(String(product.costPrice));
    setSku(product.sku);
    setBarcode(product.barcode);
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
      setSku("");
      setBarcode("");
      if (variations.length === 0) {
        setVariations([createEmptyVariation(basePrice)]);
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

    const payload: Record<string, unknown> = {
      name,
      description,
      basePrice: Number(basePrice),
      costPrice: Number(costPrice),
      unit,
      images,
      categoryId: categoryId || null,
      hasVariations,
    };

    if (!hasVariations) {
      payload.sku = sku;
      payload.barcode = barcode;
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

  function handleExport() {
    const rows = products.map((item) => ({
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
          emptyMessage="No products yet."
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

          <FormField
            id="product-name"
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <FormField
            id="product-description"
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="product-base-price"
              label="Base price"
              type="number"
              min="0"
              step="0.01"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              required
            />
            <FormField
              id="product-cost-price"
              label="Cost price"
              type="number"
              min="0"
              step="0.01"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
            />
            <UnitSelect value={unit} onValueChange={setUnit} required />
          </div>

          <FileUploadField
            id="product-images"
            label="Product images"
            mode="multiple"
            folder="products"
            value={images}
            onChange={setImages}
            maxFiles={8}
            hint="Upload multiple images. Star one image to mark it as the featured image."
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
              <FormField
                id="product-sku"
                label="SKU"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                required
              />
              <FormField
                id="product-barcode"
                label="Barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
              />
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
        </CrudDialog>

        <ProductVariationsDialog
          open={variationsDialogOpen}
          onOpenChange={setVariationsDialogOpen}
          productId={variationsProduct?._id ?? null}
          productName={variationsProduct?.name ?? "Product"}
          onUpdated={loadProducts}
        />
      </PageShell>
    </RequirePermission>
  );
}
