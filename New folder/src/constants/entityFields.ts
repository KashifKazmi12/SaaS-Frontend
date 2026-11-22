import type { EntityFieldDefinition, EntityFieldType, EntitySchemaEntity } from "@/types";

export const CUSTOMER_ROOT_KEYS = ["name", "phone", "email", "address", "notes"] as const;
export const PRODUCT_ROOT_KEYS = [
  "name",
  "description",
  "basePrice",
  "costPrice",
  "sku",
  "barcode",
  "unit",
] as const;
export const CATEGORY_ROOT_KEYS = ["name", "description"] as const;
export const STOCK_ROOT_KEYS = ["quantity", "minStock"] as const;
export const ORDER_ROOT_KEYS = ["notes"] as const;

export const ROOT_KEYS_BY_ENTITY: Record<EntitySchemaEntity, readonly string[]> = {
  customer: CUSTOMER_ROOT_KEYS,
  product: PRODUCT_ROOT_KEYS,
  category: CATEGORY_ROOT_KEYS,
  stock: STOCK_ROOT_KEYS,
  order: ORDER_ROOT_KEYS,
};

export const FIELD_TYPE_OPTIONS: Array<{ value: EntityFieldType; label: string }> = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "select", label: "Select" },
  { value: "boolean", label: "Yes / no" },
  { value: "date", label: "Date" },
];

export function isEntityRootKey(entity: EntitySchemaEntity, key: string) {
  return ROOT_KEYS_BY_ENTITY[entity].includes(key);
}

export function isCustomerRootKey(key: string) {
  return isEntityRootKey("customer", key);
}

export function toFieldKey(label: string) {
  const camel = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+([a-z0-9])/g, (_, char: string) => char.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, "");

  if (!camel) return "";
  return camel.charAt(0).toLowerCase() + camel.slice(1);
}

export function fieldTypeLabel(type: EntityFieldType) {
  return FIELD_TYPE_OPTIONS.find((option) => option.value === type)?.label || type;
}

export function emptyFieldValue(field: EntityFieldDefinition) {
  if (field.type === "boolean") return false;
  return "";
}

export function visibleAdminFields(fields: EntityFieldDefinition[]) {
  return fields.filter((field) => field.visible && field.showOnAdmin !== false);
}

/** Detail forms: all visible fields (ignore Show in list / customer-app-only toggles for display). */
export function detailEntityFields(fields: EntityFieldDefinition[]) {
  return fields.filter((field) => field.visible);
}

export function isFieldVisible(fields: EntityFieldDefinition[], key: string) {
  return visibleAdminFields(fields).some((field) => field.key === key);
}

export function listCustomColumns(fields: EntityFieldDefinition[], entity: EntitySchemaEntity) {
  return listSchemaColumns(fields, entity, false);
}

export function listSchemaColumns(
  fields: EntityFieldDefinition[],
  entity: EntitySchemaEntity,
  includeRootKeys = false
) {
  return visibleAdminFields(fields).filter(
    (field) =>
      field.showInList && (includeRootKeys || !isEntityRootKey(entity, field.key))
  );
}

export function formatCustomListValue(value: unknown, field: EntityFieldDefinition) {
  if (value === null || value === undefined || value === "") return "—";
  if (field.type === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function buildEntityPayload(
  entity: EntitySchemaEntity,
  values: Record<string, unknown>,
  fields: EntityFieldDefinition[]
) {
  const payload: Record<string, unknown> = { custom: {} };
  const custom = payload.custom as Record<string, unknown>;

  for (const field of visibleAdminFields(fields)) {
    const value = values[field.key] ?? emptyFieldValue(field);
    if (isEntityRootKey(entity, field.key)) {
      payload[field.key] = value;
    } else {
      custom[field.key] = value;
    }
  }

  return payload;
}
