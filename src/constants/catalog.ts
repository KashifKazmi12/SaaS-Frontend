export const PRODUCT_UNITS = [
  "piece",
  "kg",
  "g",
  "liter",
  "ml",
  "box",
  "pack",
  "dozen",
  "meter",
  "cm",
  "pair",
  "set",
  "bottle",
  "can",
  "bag",
] as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[number];

export const PRODUCT_UNIT_LABELS: Record<ProductUnit, string> = {
  piece: "Piece",
  kg: "Kilogram",
  g: "Gram",
  liter: "Liter",
  ml: "Milliliter",
  box: "Box",
  pack: "Pack",
  dozen: "Dozen",
  meter: "Meter",
  cm: "Centimeter",
  pair: "Pair",
  set: "Set",
  bottle: "Bottle",
  can: "Can",
  bag: "Bag",
};

export const PRODUCT_UNIT_OPTIONS = PRODUCT_UNITS.map((value) => ({
  value,
  label: PRODUCT_UNIT_LABELS[value],
}));

export const VARIATION_OPTION_TYPES = [
  "Color",
  "Size",
  "Material",
  "Style",
  "Weight",
  "Volume",
  "Flavor",
  "Pattern",
  "Length",
  "Width",
  "Capacity",
] as const;

export type VariationOptionType = (typeof VARIATION_OPTION_TYPES)[number];

export const VARIATION_OPTION_TYPE_OPTIONS = VARIATION_OPTION_TYPES.map((value) => ({
  value,
  label: value,
}));

export function isProductUnit(value: string): value is ProductUnit {
  return PRODUCT_UNITS.includes(value as ProductUnit);
}

export function normalizeProductUnit(value: string, fallback: ProductUnit = "piece"): ProductUnit {
  const normalized = value.trim().toLowerCase();
  return isProductUnit(normalized) ? normalized : fallback;
}

export function normalizeVariationOptionType(value: string): VariationOptionType | "" {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const match = VARIATION_OPTION_TYPES.find(
    (option) => option.toLowerCase() === trimmed.toLowerCase()
  );
  return match ?? "";
}
