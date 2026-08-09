import { useCategoryOptions } from "@/hooks/useCategoryOptions";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/shared/FormField";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  const selectItems = [
    ...(allowEmpty ? [{ value: "", label: emptyLabel }] : []),
    ...options.map((option) => ({ value: option.id, label: option.name })),
  ];

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
          <Select
            value={value}
            onValueChange={(nextValue) => onValueChange?.(nextValue ?? "")}
            items={selectItems}
          >
            <SelectTrigger id={id} className="w-full">
              <SelectValue placeholder={placeholder}>
                {value ? displayName : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {allowEmpty && <SelectItem value="">{emptyLabel}</SelectItem>}
              {options.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}
