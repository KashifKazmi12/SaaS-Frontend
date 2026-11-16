import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/shared";
import { FieldLabel } from "@/components/shared/FormField";
import { EnumSelect } from "@/components/shared/EnumSelect";
import { api } from "@/lib/api";
import type { ProductRecipeLine, ProductRecord } from "@/types";
import { PRODUCT_UNIT_LABELS, normalizeProductUnit } from "@/constants/catalog";

export interface RecipeDraftLine {
  productId: string;
  quantity: string;
  productName?: string;
  productUnit?: string;
}

export interface RecipeEditorProps {
  businessId: string;
  value: RecipeDraftLine[];
  onChange: (next: RecipeDraftLine[]) => void;
  disabled?: boolean;
}

function ingredientId(line: ProductRecipeLine) {
  if (typeof line.product === "object" && line.product) return line.product._id;
  return String(line.product || "");
}

function ingredientName(line: ProductRecipeLine) {
  if (typeof line.product === "object" && line.product) return line.product.name || "";
  return "";
}

function ingredientUnit(line: ProductRecipeLine) {
  if (typeof line.product === "object" && line.product) return line.product.unit || "piece";
  return "piece";
}

export function recipeDraftFromProduct(recipe?: ProductRecipeLine[]): RecipeDraftLine[] {
  if (!Array.isArray(recipe) || !recipe.length) return [];
  return recipe.map((line) => ({
    productId: ingredientId(line),
    quantity: String(line.quantity ?? ""),
    productName: ingredientName(line),
    productUnit: ingredientUnit(line),
  }));
}

export function RecipeEditor({
  businessId,
  value,
  onChange,
  disabled = false,
}: RecipeEditorProps) {
  const [options, setOptions] = useState<Array<{ value: string; label: string; unit: string }>>(
    []
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!businessId) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .getProducts({
        businessId,
        productKind: "ingredients",
        status: "active",
        limit: 200,
        page: 1,
      })
      .then((data) => {
        if (cancelled) return;
        setOptions(
          (data.items as ProductRecord[]).map((product) => ({
            value: product._id,
            label: product.sku ? `${product.name} (${product.sku})` : product.name,
            unit: product.unit || "piece",
          }))
        );
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  function updateRow(index: number, patch: Partial<RecipeDraftLine>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    onChange([...value, { productId: "", quantity: "1" }]);
  }

  function removeRow(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <FieldLabel>Recipe (ingredients)</FieldLabel>
        <p className="text-xs text-muted-foreground">
          When this product is sold, stock drops from these ingredients (managed under Raw materials),
          not from this product’s own quantity.
        </p>
      </div>

      {!businessId ? (
        <p className="text-sm text-muted-foreground">Select a business first.</p>
      ) : loading ? (
        <p className="text-sm text-muted-foreground">Loading ingredients…</p>
      ) : value.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recipe lines yet.</p>
      ) : (
        <div className="space-y-3">
          {value.map((row, index) => {
            const selected = options.find((option) => option.value === row.productId);
            const unit = selected?.unit || row.productUnit || "piece";
            const unitLabel =
              PRODUCT_UNIT_LABELS[normalizeProductUnit(unit)] || unit;
            return (
              <div
                key={`recipe-${index}`}
                className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1.4fr_1fr_auto]"
              >
                <EnumSelect
                  id={`recipe-product-${index}`}
                  label="Ingredient"
                  value={row.productId}
                  onValueChange={(productId) => {
                    const match = options.find((option) => option.value === productId);
                    updateRow(index, {
                      productId,
                      productName: match?.label,
                      productUnit: match?.unit,
                    });
                  }}
                  options={options}
                  placeholder={options.length ? "Select ingredient" : "No raw materials yet"}
                  required
                  disabled={disabled || !options.length}
                />
                <FormField
                  id={`recipe-qty-${index}`}
                  label={`Qty (${unitLabel})`}
                  type="number"
                  min={0.000001}
                  step="any"
                  value={row.quantity}
                  onChange={(event) => updateRow(index, { quantity: event.target.value })}
                  required
                  disabled={disabled}
                />
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    aria-label="Remove ingredient"
                    disabled={disabled}
                    onClick={() => removeRow(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addRow}
        disabled={disabled || !businessId}
      >
        <Plus className="size-4" />
        Add ingredient
      </Button>
    </div>
  );
}
