import {
  type BusinessOptionScope,
  useBusinessOptions,
} from "@/hooks/useBusinessOptions";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { FieldLabel } from "@/components/shared/FormField";

export interface BusinessMultiSelectProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  scope?: BusinessOptionScope;
  label?: string;
  hint?: string;
  placeholder?: string;
  className?: string;
  id?: string;
  required?: boolean;
}

export function BusinessMultiSelect({
  value,
  onValueChange,
  scope = "all",
  label = "Businesses",
  hint,
  placeholder = "Search businesses...",
  className,
  id = "business-multi-select",
  required = false,
}: BusinessMultiSelectProps) {
  const anchor = useComboboxAnchor();
  const { options, loading, error, labelById } = useBusinessOptions(scope);
  const optionIds = options.map((option) => option.id);

  if (loading) {
    return (
      <div className={className}>
        <div className="space-y-2">
          <FieldLabel htmlFor={id} required={required}>
            {label}
          </FieldLabel>
          <p className="text-sm text-muted-foreground">Loading businesses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <div className="space-y-2">
          <FieldLabel htmlFor={id} required={required}>
            {label}
          </FieldLabel>
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className={className}>
        <div className="space-y-2">
          <FieldLabel htmlFor={id} required={required}>
            {label}
          </FieldLabel>
          <p className="text-sm text-muted-foreground">No businesses available.</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-2">
        <FieldLabel htmlFor={id} required={required}>
          {label}
        </FieldLabel>
        <Combobox
          items={optionIds}
          multiple
          value={value}
          onValueChange={onValueChange}
          itemToStringLabel={(businessId) => labelById[businessId] ?? ""}
        >
          <ComboboxChips ref={anchor} className="w-full">
            <ComboboxValue>
              {value.map((businessId) => (
                <ComboboxChip key={businessId}>{labelById[businessId]}</ComboboxChip>
              ))}
            </ComboboxValue>
            <ComboboxChipsInput id={id} placeholder={placeholder} />
          </ComboboxChips>
          <ComboboxContent anchor={anchor}>
            <ComboboxEmpty>No businesses found.</ComboboxEmpty>
            <ComboboxList>
              {(businessId) => (
                <ComboboxItem key={businessId} value={businessId}>
                  {labelById[businessId]}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}
