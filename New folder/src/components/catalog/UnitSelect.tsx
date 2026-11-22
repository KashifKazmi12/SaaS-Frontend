import { EnumSelect } from "@/components/shared/EnumSelect";
import {
  PRODUCT_UNIT_OPTIONS,
  type ProductUnit,
  normalizeProductUnit,
} from "@/constants/catalog";

export interface UnitSelectProps {
  value: string;
  onValueChange?: (value: ProductUnit) => void;
  label?: string;
  placeholder?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
}

export function UnitSelect({
  value,
  onValueChange,
  label = "Unit",
  placeholder = "Select unit",
  id = "product-unit",
  required = false,
  disabled = false,
  readOnly = false,
  className,
}: UnitSelectProps) {
  const normalized = normalizeProductUnit(value);

  return (
    <EnumSelect
      value={normalized}
      onValueChange={onValueChange}
      options={PRODUCT_UNIT_OPTIONS}
      label={label}
      placeholder={placeholder}
      id={id}
      required={required}
      disabled={disabled}
      readOnly={readOnly}
      className={className}
    />
  );
}
