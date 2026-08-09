import { EnumSelect } from "@/components/shared/EnumSelect";
import {
  VARIATION_OPTION_TYPE_OPTIONS,
  type VariationOptionType,
  normalizeVariationOptionType,
} from "@/constants/catalog";

export interface VariationOptionTypeSelectProps {
  value: string;
  onValueChange?: (value: VariationOptionType) => void;
  label?: string;
  placeholder?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function VariationOptionTypeSelect({
  value,
  onValueChange,
  label = "Option type",
  placeholder = "Select type",
  id,
  required = false,
  disabled = false,
  className,
}: VariationOptionTypeSelectProps) {
  const normalized = normalizeVariationOptionType(value) || VARIATION_OPTION_TYPE_OPTIONS[0].value;

  return (
    <EnumSelect
      value={normalized}
      onValueChange={onValueChange}
      options={VARIATION_OPTION_TYPE_OPTIONS}
      label={label}
      placeholder={placeholder}
      id={id}
      required={required}
      disabled={disabled}
      className={className}
    />
  );
}
