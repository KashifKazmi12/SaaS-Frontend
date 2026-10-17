import { useMemo } from "react";
import { useCategoryOptions } from "@/hooks/useCategoryOptions";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/shared/FormField";
import { EnumSelect } from "@/components/shared/EnumSelect";

export interface CategorySelectProps {
  businessId: string;
  value: string;
  onValueChange?: (value: string) => void;
  readOnly?: boolean;
  label?: string;
  hint?: string;
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  className?: string;
  id?: string;
  required?: boolean;
}

export function CategorySelect({
  businessId,
  value,
  onValueChange,
  readOnly = false,
  label = "Category",
  hint,
  placeholder = "Select category",
  allowEmpty = true,
  emptyLabel = "No category",
  className,
  id = "category-select",
  required = false,
}: CategorySelectProps) {
  const { options, loading, error, getLabel } = useCategoryOptions(businessId);

  const selectItems = useMemo(
    () => [
      ...(allowEmpty ? [{ value: "", label: emptyLabel }] : []),
      ...options.map((option) => ({ value: option.id, label: option.name })),
    ],
    [allowEmpty, emptyLabel, options]
  );

  const displayName = value ? getLabel(value) : emptyLabel;

  if (!businessId) {
    return (
      <div className={className}>
        <div className="space-y-2">
          {label && (
            <FieldLabel htmlFor={id} required={required}>
              {label}
            </FieldLabel>
          )}
          <Input id={id} value="Select a business first" disabled />
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-2">
        {label && (
          <FieldLabel htmlFor={id} required={required}>
            {label}
          </FieldLabel>
        )}

        {readOnly ? (
          <Input id={id} value={displayName || "—"} disabled />
        ) : loading ? (
          <Input id={id} value="Loading categories..." disabled />
        ) : error ? (
          <Input id={id} value={error} disabled aria-invalid />
        ) : (
          <EnumSelect
            id={id}
            value={value}
            onValueChange={onValueChange}
            options={selectItems}
            placeholder={placeholder}
            required={required}
          />
        )}

        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}
