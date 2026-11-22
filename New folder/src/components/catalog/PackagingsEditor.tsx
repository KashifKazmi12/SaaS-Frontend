import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/shared";
import { UnitSelect } from "@/components/catalog/UnitSelect";
import { FieldLabel } from "@/components/shared/FormField";
import type { ProductPackaging } from "@/types";
import { normalizeProductUnit, type ProductUnit } from "@/constants/catalog";

export interface PackagingsEditorProps {
  baseUnit: string;
  value: ProductPackaging[];
  onChange: (next: ProductPackaging[]) => void;
  disabled?: boolean;
}

export function PackagingsEditor({
  baseUnit,
  value,
  onChange,
  disabled = false,
}: PackagingsEditorProps) {
  const rows = value.length ? value : [];

  function updateRow(index: number, patch: Partial<ProductPackaging>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    onChange([
      ...rows,
      {
        unit: "pack",
        factorToBase: 1,
        label: "",
      },
    ]);
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <FieldLabel>Packaging</FieldLabel>
        <p className="text-xs text-muted-foreground">
          Stock is always kept in the base unit ({normalizeProductUnit(baseUnit)}). Add packs/boxes
          that convert into that unit — e.g. 1 pack = 10 pieces.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No packaging conversions yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((row, index) => (
            <div
              key={`${row.unit}-${index}`}
              className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_1fr_auto]"
            >
              <UnitSelect
                id={`packaging-unit-${index}`}
                label="Pack unit"
                value={row.unit}
                onValueChange={(unit: ProductUnit) => updateRow(index, { unit })}
                disabled={disabled}
                required
              />
              <FormField
                id={`packaging-factor-${index}`}
                label={`Equals how many ${normalizeProductUnit(baseUnit)}?`}
                type="number"
                min={0.000001}
                step="any"
                value={String(row.factorToBase ?? "")}
                onChange={(event) =>
                  updateRow(index, { factorToBase: Number(event.target.value) || 0 })
                }
                required
                disabled={disabled}
              />
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Remove packaging"
                  disabled={disabled}
                  onClick={() => removeRow(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={disabled}>
        <Plus className="size-4" />
        Add packaging
      </Button>
    </div>
  );
}
