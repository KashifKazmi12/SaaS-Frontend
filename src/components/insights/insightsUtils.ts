import { ORDER_PAYMENT_STATUS_OPTIONS, ORDER_STATUS_OPTIONS } from "@/lib/listFilters";
import type { InsightsRange } from "@/types";

export function insightsRangeLabel(range: InsightsRange) {
  if (range === "today") return "Today";
  if (range === "7d") return "Last 7 days";
  if (range === "30d") return "Last 30 days";
  return "Custom";
}

function parseInsightDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value.slice(0, 10)) && value.length <= 10) {
    return new Date(`${value}T12:00:00`);
  }
  return new Date(value);
}

export function formatInsightDate(value: string) {
  const date = parseInsightDate(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

export function formatInsightDateRange(from: string, to: string) {
  const start = parseInsightDate(from);
  const end = parseInsightDate(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  const fmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

export function statusLabel(status: string) {
  return ORDER_STATUS_OPTIONS.find((option) => option.value === status)?.label || status;
}

export function paymentLabel(status: string) {
  return ORDER_PAYMENT_STATUS_OPTIONS.find((option) => option.value === status)?.label || status;
}

export function statusTone(status: string) {
  if (status === "completed") return "success" as const;
  if (status === "cancelled") return "danger" as const;
  if (status === "pending") return "muted" as const;
  return "info" as const;
}

export function paymentTone(status: string) {
  if (status === "paid") return "success" as const;
  if (status === "refunded") return "muted" as const;
  if (status === "refund_pending") return "warning" as const;
  return "danger" as const;
}

export const toneStyles = {
  success: {
    bar: "bg-emerald-500",
    soft: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-500/20",
  },
  info: {
    bar: "bg-sky-500",
    soft: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    ring: "ring-sky-500/20",
  },
  warning: {
    bar: "bg-amber-500",
    soft: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
    ring: "ring-amber-500/20",
  },
  danger: {
    bar: "bg-rose-500",
    soft: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    ring: "ring-rose-500/20",
  },
  muted: {
    bar: "bg-muted-foreground/50",
    soft: "bg-muted text-muted-foreground",
    ring: "ring-border",
  },
} as const;
