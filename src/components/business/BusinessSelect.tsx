import { useMemo } from "react";
import {
  type BusinessOptionScope,
  useBusinessOptions,
  useBusinessVisibility,
} from "@/hooks/useBusinessOptions";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/shared/FormField";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type BusinessSelectVisibility =
  | "always"
  | "hide-when-single"
  | "readonly-when-single";

export interface BusinessSelectExtraOption {
  value: string;
  label: string;
}

export interface BusinessSelectProps {
  value: string;
  onValueChange?: (value: string) => void;
  scope: BusinessOptionScope;
  readOnly?: boolean;
  label?: string;
  hint?: string;
  placeholder?: string;
  className?: string;
  id?: string;
  /** When single assigned business: hide field, readonly input, or always show picker */
  visibility?: BusinessSelectVisibility;
  /** Prepended options (e.g. platform default for super admin) */
  extraOptions?: BusinessSelectExtraOption[];
  required?: boolean;
}

export function BusinessSelect({
  value,
  onValueChange,
  scope,
  readOnly = false,
  label = "Business",
  hint,
  placeholder = "Select business",
  className,
  id = "business-select",
  visibility = "readonly-when-single",
  extraOptions = [],
  required = false,
}: BusinessSelectProps) {
  const { options, loading, error, getLabel } = useBusinessOptions(scope);
  const { isSuperAdmin, assignedCount } = useBusinessVisibility();

  const mergedOptions = useMemo(() => {
    const extraIds = new Set(extraOptions.map((option) => option.value));
    const extras = extraOptions.map((option) => ({ id: option.value, name: option.label }));
    const rest = options.filter((option) => !extraIds.has(option.id));
    return [...extras, ...rest];
  }, [extraOptions, options]);

  const selectItems = useMemo(
    () => mergedOptions.map((option) => ({ value: option.id, label: option.name })),
    [mergedOptions]
  );

  const labelById = useMemo(
    () => Object.fromEntries(mergedOptions.map((option) => [option.id, option.name])),
    [mergedOptions]
  );

  const displayName =
    labelById[value] || getLabel(value) || options.find((option) => option.id === value)?.name || "";

  const hasMultipleChoices =
    isSuperAdmin ||
    scope === "all" ||
    extraOptions.length > 0 ||
    assignedCount > 1 ||
    options.length > 1;

  if (visibility === "hide-when-single" && !hasMultipleChoices) {
    return null;
  }

  const showDropdown =
    !readOnly &&
    (visibility === "always" ||
      isSuperAdmin ||
      scope === "all" ||
      extraOptions.length > 0 ||
      assignedCount > 1 ||
      options.length > 1);

  const showLabel = label.trim().length > 0;

  const showRequiredMarker = required || (!readOnly && showDropdown);

  return (
    <div className={className}>
      <div className="space-y-2">
        {showLabel && (
          <FieldLabel htmlFor={id} required={showRequiredMarker}>
            {label}
          </FieldLabel>
        )}

        {readOnly || !showDropdown ? (
          <Input id={id} value={displayName || "—"} disabled />
        ) : loading ? (
          <Input id={id} value="Loading businesses..." disabled />
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
                {displayName || null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {mergedOptions.map((option) => (
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
