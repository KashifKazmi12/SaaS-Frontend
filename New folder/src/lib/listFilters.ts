export const ALL_FILTER = "all";

export const STATUS_FILTER_OPTIONS = [
  { value: ALL_FILTER, label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export const STOCK_LEVEL_FILTER_OPTIONS = [
  { value: ALL_FILTER, label: "All stock" },
  { value: "in", label: "In stock" },
  { value: "low", label: "Low stock" },
  { value: "out", label: "Out of stock" },
];

export const ORDER_STATUS_FILTER_OPTIONS = [
  { value: ALL_FILTER, label: "All order statuses" },
  { value: "open", label: "Open" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "in_transit", label: "In transit" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export const ORDER_STATUS_TABS = [
  { value: ALL_FILTER, label: "All" },
  { value: "open", label: "Open" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const ORDER_PAYMENT_FILTER_OPTIONS = [
  { value: ALL_FILTER, label: "All payment" },
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
  { value: "refund_pending", label: "Refund pending" },
  { value: "refunded", label: "Refunded" },
];

export const ORDER_PAYMENT_METHOD_OPTIONS = [
  { value: "unpaid", label: "Pay later" },
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "store_credit", label: "Store credit" },
  { value: "stripe", label: "Card (Stripe)" },
];

export const ORDER_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "in_transit", label: "In transit" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export const ORDER_PAYMENT_STATUS_OPTIONS = [
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
  { value: "refund_pending", label: "Refund pending" },
  { value: "refunded", label: "Refunded" },
];

export function orderPaymentStatusLabel(status: string) {
  return (
    ORDER_PAYMENT_STATUS_OPTIONS.find((option) => option.value === status)?.label || status
  );
}

export function matchesSearch(
  query: string,
  ...fields: Array<string | number | null | undefined>
) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((field) => String(field ?? "").toLowerCase().includes(needle));
}

export function matchesStatus(isActive: boolean, filter: string) {
  if (filter === "active") return isActive;
  if (filter === "inactive") return !isActive;
  return true;
}

export function uniqueSelectOptions<T>(
  rows: T[],
  getId: (row: T) => string | null | undefined,
  getLabel: (row: T) => string | null | undefined
) {
  const map = new Map<string, string>();

  for (const row of rows) {
    const id = getId(row);
    const label = getLabel(row);
    if (id && label) map.set(id, label);
  }

  return [...map.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function relatedId(value: { _id: string } | string | null | undefined) {
  if (!value) return "";
  if (typeof value === "object") return value._id;
  return value;
}

export function relatedName(value: { name: string } | string | null | undefined) {
  if (!value || typeof value !== "object") return "";
  return value.name;
}
