import { useEffect, useMemo } from "react";
import { FieldLabel } from "@/components/shared/FormField";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { BusinessGroupRecord } from "@/types";
import { useBusinessGroupOptions } from "@/hooks/useBusinessGroupOptions";

export type BusinessGroupSelectVisibility =
  | "always"
  | "hide-when-single"
  | "readonly-when-single";

export interface BusinessGroupSelectOption {
  id: string;
  name: string;
}

export interface BusinessGroupSelectProps {
  value: string;
  onValueChange?: (value: string) => void;
  groups?: BusinessGroupRecord[];
  /** When set, use these instead of loading / groups prop. */
  options?: BusinessGroupSelectOption[];
  readOnly?: boolean;
  label?: string;
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  className?: string;
  triggerClassName?: string;
  id?: string;
  required?: boolean;
  triggerSize?: "sm" | "default";
  /** When one group: hide field, show readonly, or always show picker */
  visibility?: BusinessGroupSelectVisibility;
}

export function BusinessGroupSelect({
  value,
  onValueChange,
  groups,
  options: optionsProp,
  readOnly = false,
  label = "Business group",
  placeholder = "Select business group",
  allowEmpty = true,
  emptyLabel = "No group",
  className,
  triggerClassName,
  id = "business-group-select",
  required = false,
  triggerSize = "default",
  visibility = "hide-when-single",
}: BusinessGroupSelectProps) {
  const hooked = useBusinessGroupOptions({ groups: optionsProp ? undefined : groups });
  const usingCustomOptions = Array.isArray(optionsProp);
  const options = usingCustomOptions ? optionsProp : hooked.options;
  const loading = usingCustomOptions ? false : hooked.loading;
  const error = usingCustomOptions ? null : hooked.error;
  const getLabel = usingCustomOptions
    ? (idValue: string) => options.find((option) => option.id === idValue)?.name || ""
    : hooked.getLabel;

  const selectItems = useMemo(
    () => [
      ...(allowEmpty ? [{ value: "", label: emptyLabel }] : []),
      ...options.map((option) => ({ value: option.id, label: option.name })),
    ],
    [allowEmpty, emptyLabel, options]
  );

  const displayName = value ? getLabel(value) : emptyLabel;
  const choiceCount = options.length;
  // Exactly one group — hide/auto-select. Zero must stay visible while session loads.
  const isSingleChoice = !loading && !allowEmpty && choiceCount === 1;

  useEffect(() => {
    if (loading || allowEmpty || choiceCount !== 1) return;
    const onlyId = options[0].id;
    if (value !== onlyId) onValueChange?.(onlyId);
  }, [loading, allowEmpty, choiceCount, options, value, onValueChange]);

  if (visibility === "hide-when-single" && isSingleChoice) {
    return null;
  }

  const showDropdown =
    !readOnly &&
    (visibility === "always" ||
      visibility === "hide-when-single" ||
      (visibility === "readonly-when-single" && choiceCount > 1));

  const showLabel = Boolean(label?.trim());
  const showRequiredMarker = required && !allowEmpty && showDropdown;

  return (
    <div className={className}>
      <div className={cn(showLabel ? "space-y-2" : undefined)}>
        {showLabel ? (
          <FieldLabel htmlFor={id} required={showRequiredMarker}>
            {label}
          </FieldLabel>
        ) : null}

        {readOnly || !showDropdown ? (
          <Input id={id} value={displayName || "—"} disabled />
        ) : loading ? (
          <Input id={id} value="Loading business groups..." disabled />
        ) : error ? (
          <Input id={id} value={error} disabled aria-invalid />
        ) : (
          <Select
            value={value}
            onValueChange={(nextValue) => onValueChange?.(nextValue ?? "")}
            items={selectItems}
          >
            <SelectTrigger id={id} size={triggerSize} className={cn("w-full", triggerClassName)}>
              <SelectValue placeholder={placeholder} />
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
      </div>
    </div>
  );
}
