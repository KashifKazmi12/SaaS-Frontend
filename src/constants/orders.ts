import type { OrderPaymentStatus, OrderStatus } from "@/types";
import {
  ORDER_PAYMENT_STATUS_OPTIONS,
  ORDER_STATUS_OPTIONS,
} from "@/lib/listFilters";

/** Open stages — labels only; no loyalty/refund side effects (keep in sync with Backend). */
export const OPEN_ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "in_transit",
];

function openTransitionsFrom(current: OrderStatus): OrderStatus[] {
  return [
    ...OPEN_ORDER_STATUSES.filter((status) => status !== current),
    "completed",
    "cancelled",
  ];
}

/** Admin-controlled status paths (keep in sync with Backend). Completed/cancelled lock status. */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> =
  Object.fromEntries([
    ...OPEN_ORDER_STATUSES.map((status) => [status, openTransitionsFrom(status)]),
    ["completed", []],
    ["cancelled", []],
  ]) as Record<OrderStatus, OrderStatus[]>;

export function allowedOrderStatusOptions(current: OrderStatus) {
  const allowed = new Set<OrderStatus>([current, ...(ORDER_STATUS_TRANSITIONS[current] || [])]);
  return ORDER_STATUS_OPTIONS.filter((option) =>
    allowed.has(option.value as OrderStatus)
  );
}

/**
 * Payment statuses an admin may pick.
 * Open: unpaid | paid. Completed: locked. Refund states are cancel-only / automatic.
 */
export function allowedPaymentStatusesForOrder(
  orderStatus: OrderStatus,
  currentPaymentStatus: OrderPaymentStatus
): OrderPaymentStatus[] {
  if (orderStatus === "cancelled") {
    if (currentPaymentStatus === "refund_pending") return ["refund_pending", "refunded"];
    if (currentPaymentStatus === "refunded") return ["refunded"];
    return [currentPaymentStatus];
  }

  if (orderStatus === "completed") {
    return [currentPaymentStatus];
  }

  return ["unpaid", "paid"];
}

export function allowedPaymentStatusOptions(
  orderStatus: OrderStatus,
  currentPaymentStatus: OrderPaymentStatus
) {
  const allowed = new Set(
    allowedPaymentStatusesForOrder(orderStatus, currentPaymentStatus)
  );
  return ORDER_PAYMENT_STATUS_OPTIONS.filter((option) =>
    allowed.has(option.value as OrderPaymentStatus)
  );
}

export function isOpenOrderStatus(status: OrderStatus) {
  return OPEN_ORDER_STATUSES.includes(status);
}

export function isTerminalOrderStatus(status: OrderStatus) {
  return status === "completed" || status === "cancelled";
}
