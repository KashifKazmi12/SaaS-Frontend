import { useEffect, useMemo } from "react";
import {
  type BusinessOptionScope,
  useBusinessOptions,
  type BusinessOption,
} from "@/hooks/useBusinessOptions";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/shared/FormField";
import { cn } from "@/lib/utils";
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
  triggerClassName?: string;
  id?: string;
  /** When one choice: hide field, show readonly, or always show picker */
  visibility?: BusinessSelectVisibility;
  /** Prepended options (e.g. platform default / All branches) */
  extraOptions?: BusinessSelectExtraOption[];
  /** When set, use these instead of loading from scope (e.g. businesses in one group). */
  options?: BusinessOption[];
  required?: boolean;
  triggerSize?: "sm" | "default";
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
  triggerClassName,
  id = "business-select",
  visibility = "hide-when-single",
  extraOptions = [],
  options: optionsProp,
  required = false,
  triggerSize = "default",
}: BusinessSelectProps) {
  const hooked = useBusinessOptions(scope);
  const usingCustomOptions = Array.isArray(optionsProp);
  const baseOptions = usingCustomOptions ? optionsProp : hooked.options;
  const loading = usingCustomOptions ? false : hooked.loading;
  const error = usingCustomOptions ? null : hooked.error;
  const getLabel = usingCustomOptions
    ? (idValue: string) => baseOptions.find((option) => option.id === idValue)?.name || ""
    : hooked.getLabel;

  const mergedOptions = useMemo(() => {
    const extraIds = new Set(extraOptions.map((option) => option.value));
    const extras = extraOptions.map((option) => ({ id: option.value, name: option.label }));
    const rest = baseOptions.filter((option) => !extraIds.has(option.id));
    return [...extras, ...rest];
  }, [extraOptions, baseOptions]);

  const selectItems = useMemo(
    () => mergedOptions.map((option) => ({ value: option.id, label: option.name })),
    [mergedOptions]
  );

  const labelById = useMemo(
    () => Object.fromEntries(mergedOptions.map((option) => [option.id, option.name])),
    [mergedOptions]
  );

  const displayName =
    labelById[value] || getLabel(value) || baseOptions.find((option) => option.id === value)?.name || "";

  const choiceCount = mergedOptions.length;
  // Exactly one option — hide/auto-select. Zero options must stay visible (e.g. pick group first).
  const isSingleChoice = !loading && choiceCount === 1;

  useEffect(() => {
    if (loading || choiceCount !== 1) return;
    const onlyId = mergedOptions[0].id;
    if (value !== onlyId) onValueChange?.(onlyId);
  }, [loading, choiceCount, mergedOptions, value, onValueChange]);

  if (visibility === "hide-when-single" && isSingleChoice) {
    return null;
  }

  const showDropdown =
    !readOnly &&
    (visibility === "always" ||
      visibility === "hide-when-single" ||
      (visibility === "readonly-when-single" && choiceCount > 1));

  const showLabel = label.trim().length > 0;
  const showRequiredMarker = required && showDropdown;

  return (
    <div className={className}>
      <div className={cn(showLabel || hint ? "space-y-2" : undefined)}>
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
            <SelectTrigger id={id} size={triggerSize} className={cn("w-full", triggerClassName)}>
              <SelectValue placeholder={placeholder}>{displayName || null}</SelectValue>
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
