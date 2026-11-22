import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ProductVariationsEditor } from "@/components/catalog/ProductVariationsEditor";
import { PageAlerts } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import type { ProductVariationRecord, VariationDraft } from "@/types";
import { normalizeVariationOptionType } from "@/constants/catalog";

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

interface ProductVariationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | null;
  productName: string;
  currency?: string;
  canEdit?: boolean;
  onUpdated?: () => void;
}

export function ProductVariationsDialog({
  open,
  onOpenChange,
  productId,
  productName,
  currency = "PKR",
  canEdit = true,
  onUpdated,
}: ProductVariationsDialogProps) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [variations, setVariations] = useState<ProductVariationRecord[]>([]);
  const [drafts, setDrafts] = useState<VariationDraft[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadVariations() {
    if (!productId) return;

    setLoading(true);
    setError("");
    try {
      const detail = await api.getProduct(productId);
      setVariations(detail.variations);
      setDrafts(detail.variations.map(variationToDraft));
      setDeletedIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load variations.");
      setVariations([]);
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && productId) {
      setMode("view");
      loadVariations();
    }
  }, [open, productId]);

  function updateDrafts(next: VariationDraft[]) {
    const nextIds = new Set(next.map((row) => row._id).filter(Boolean));
    const removedIds = drafts
      .filter((row) => row._id && !nextIds.has(row._id))
      .map((row) => row._id as string);

    if (removedIds.length > 0) {
      setDeletedIds((current) => [...current, ...removedIds]);
    }

    setDrafts(next);
  }

  async function handleSave() {
    if (!productId) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await api.updateProduct(productId, { hasVariations: drafts.length > 0 });

      for (const variationId of deletedIds) {
        await api.deleteProductVariation(productId, variationId);
      }

      for (const draft of drafts) {
        const payload = draftToPayload(draft);
        if (draft._id) {
          await api.updateProductVariation(productId, draft._id, payload);
        } else {
          await api.createProductVariation(productId, payload);
        }
      }

      setMessage("Variations saved.");
      setMode("view");
      await loadVariations();
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save variations.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Variations — {productName}</DialogTitle>
        </DialogHeader>

        <PageAlerts error={error} message={message} />

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading variations...</p>
        ) : mode === "view" ? (
          <>
            {variations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No variations yet. Use Manage to add size, color, or other options with SKU and barcode
                per variant.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Options</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variations.map((variation) => (
                    <TableRow key={variation._id}>
                      <TableCell className="font-medium">{variation.name}</TableCell>
                      <TableCell>{variation.sku}</TableCell>
                      <TableCell>{variation.barcode || "—"}</TableCell>
                      <TableCell>{formatMoney(variation.price, currency)}</TableCell>
                      <TableCell className="max-w-xs text-xs text-muted-foreground">
                        {variation.options.map((option) => `${option.name}: ${option.value}`).join(" · ") ||
                          "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={variation.isActive ? "default" : "secondary"}>
                          {variation.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        ) : (
          <ProductVariationsEditor variations={drafts} onChange={updateDrafts} disabled={saving} />
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {canEdit && mode === "view" && (
              <Button type="button" variant="outline" onClick={() => setMode("edit")}>
                {variations.length === 0 ? "Add variations" : "Manage variations"}
              </Button>
            )}
            {mode === "edit" && (
              <Button type="button" variant="ghost" onClick={() => setMode("view")}>
                Back to list
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {canEdit && mode === "edit" && (
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save variations"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
