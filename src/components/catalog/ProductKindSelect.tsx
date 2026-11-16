import { EnumSelect } from "@/components/shared/EnumSelect";
import {
  PRODUCT_KIND_OPTIONS,
  type ProductKind,
  normalizeProductKind,
} from "@/constants/catalog";

export interface ProductKindSelectProps {
  value: string;
  onValueChange?: (value: ProductKind) => void;
  label?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ProductKindSelect({
  value,
  onValueChange,
  label = "Product type",
  id = "product-kind",
  required = false,
  disabled = false,
  className,
}: ProductKindSelectProps) {
  return (
    <EnumSelect
      value={normalizeProductKind(value)}
      onValueChange={onValueChange}
      options={PRODUCT_KIND_OPTIONS}
      label={label}
      placeholder="Select type"
      id={id}
      required={required}
      disabled={disabled}
      className={className}
      hint="Raw materials stay out of order catalogs. Recipes can only use raw or sellable & raw items."
    />
  );
}
