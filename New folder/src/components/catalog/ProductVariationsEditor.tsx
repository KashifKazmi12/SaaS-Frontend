import { Plus, Trash2 } from "lucide-react";
import { FieldLabel } from "@/components/shared/FormField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { VARIATION_OPTION_TYPES } from "@/constants/catalog";
import { VariationOptionTypeSelect } from "./VariationOptionTypeSelect";
import type { VariationDraft } from "@/types";

export function createEmptyVariation(basePrice = "0"): VariationDraft {
  return {
    name: "",
    sku: "",
    barcode: "",
    price: basePrice,
    costPrice: "0",
    isActive: true,
    options: [{ name: VARIATION_OPTION_TYPES[0], value: "" }],
  };
}

interface ProductVariationsEditorProps {
  variations: VariationDraft[];
  onChange: (variations: VariationDraft[]) => void;
  disabled?: boolean;
}

export function ProductVariationsEditor({
  variations,
  onChange,
  disabled = false,
}: ProductVariationsEditorProps) {
  function updateVariation(index: number, patch: Partial<VariationDraft>) {
    onChange(variations.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function updateOption(index: number, optionIndex: number, field: "name" | "value", value: string) {
    onChange(
      variations.map((row, i) => {
        if (i !== index) return row;
        const options = row.options.map((option, j) =>
          j === optionIndex ? { ...option, [field]: value } : option
        );
        return { ...row, options };
      })
    );
  }

  function addOption(index: number) {
    onChange(
      variations.map((row, i) =>
        i === index ? { ...row, options: [...row.options, { name: VARIATION_OPTION_TYPES[0], value: "" }] } : row
      )
    );
  }

  function removeOption(variationIndex: number, optionIndex: number) {
    onChange(
      variations.map((row, i) => {
        if (i !== variationIndex) return row;
        const options = row.options.filter((_, j) => j !== optionIndex);
        return { ...row, options: options.length ? options : [{ name: VARIATION_OPTION_TYPES[0], value: "" }] };
      })
    );
  }

  function removeVariation(index: number) {
    onChange(variations.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Variations</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onChange([...variations, createEmptyVariation()])}
        >
          <Plus className="size-3.5" />
          Add variation
        </Button>
      </div>

      {variations.length === 0 ? (
        <p className="text-sm text-muted-foreground">Add at least one variation with SKU and barcode.</p>
      ) : (
        <div className="space-y-4">
          {variations.map((variation, index) => (
            <div key={variation._id ?? `new-${index}`} className="rounded-lg border bg-muted/20 p-3 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">Variation {index + 1}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled}
                  onClick={() => removeVariation(index)}
                  aria-label="Remove variation"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel htmlFor={`variation-name-${index}`} required>
                    Display name
                  </FieldLabel>
                  <Input
                    id={`variation-name-${index}`}
                    value={variation.name}
                    disabled={disabled}
                    placeholder="Red / Medium"
                    onChange={(e) => updateVariation(index, { name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor={`variation-sku-${index}`} required>
                    SKU
                  </FieldLabel>
                  <Input
                    id={`variation-sku-${index}`}
                    value={variation.sku}
                    disabled={disabled}
                    placeholder="TSH-RED-M"
                    onChange={(e) => updateVariation(index, { sku: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`variation-barcode-${index}`}>Barcode</Label>
                  <Input
                    id={`variation-barcode-${index}`}
                    value={variation.barcode}
                    disabled={disabled}
                    placeholder="8901000000102"
                    onChange={(e) => updateVariation(index, { barcode: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor={`variation-price-${index}`} required>
                    Price
                  </FieldLabel>
                  <Input
                    id={`variation-price-${index}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={variation.price}
                    disabled={disabled}
                    onChange={(e) => updateVariation(index, { price: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`variation-cost-${index}`}>Cost price</Label>
                  <Input
                    id={`variation-cost-${index}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={variation.costPrice}
                    disabled={disabled}
                    onChange={(e) => updateVariation(index, { costPrice: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Checkbox
                    id={`variation-active-${index}`}
                    checked={variation.isActive}
                    disabled={disabled}
                    onCheckedChange={(checked) => updateVariation(index, { isActive: Boolean(checked) })}
                  />
                  <Label htmlFor={`variation-active-${index}`}>Active</Label>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Options</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={disabled}
                    onClick={() => addOption(index)}
                  >
                    Add option
                  </Button>
                </div>
                <div className="space-y-2">
                  {variation.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-end">
                      <VariationOptionTypeSelect
                        id={`variation-option-type-${index}-${optionIndex}`}
                        value={option.name}
                        onValueChange={(nextValue) => updateOption(index, optionIndex, "name", nextValue)}
                        disabled={disabled}
                        label="Type"
                        required
                      />
                      <div className="space-y-2">
                        <FieldLabel htmlFor={`variation-option-value-${index}-${optionIndex}`} required>
                          Value
                        </FieldLabel>
                        <Input
                          id={`variation-option-value-${index}-${optionIndex}`}
                          value={option.value}
                          disabled={disabled}
                          placeholder="Red"
                          onChange={(e) => updateOption(index, optionIndex, "value", e.target.value)}
                          required
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={disabled || variation.options.length <= 1}
                        onClick={() => removeOption(index, optionIndex)}
                        aria-label="Remove option"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
