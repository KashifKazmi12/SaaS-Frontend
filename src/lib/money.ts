import { GROUP_CURRENCIES, type GroupCurrency } from "@/constants/commerce";

export function normalizeCurrency(value?: string | null): GroupCurrency {
  const code = String(value || "")
    .trim()
    .toUpperCase();
  return (GROUP_CURRENCIES as readonly string[]).includes(code)
    ? (code as GroupCurrency)
    : "PKR";
}

export function currencyFromGroup(
  group?: { currency?: string | null } | string | null
): GroupCurrency {
  if (!group || typeof group === "string") return "PKR";
  return normalizeCurrency(group.currency);
}

export function currencyFromBusiness(
  business?:
    | {
        businessGroup?: { currency?: string | null } | string | null;
      }
    | string
    | null
): GroupCurrency {
  if (!business || typeof business === "string") return "PKR";
  return currencyFromGroup(
    typeof business.businessGroup === "object" ? business.businessGroup : null
  );
}

/** Group-aware money label, e.g. "PKR 899" / "$24.99" / "€12.50". */
export function formatMoney(amount: number, currency?: string | null) {
  const code = normalizeCurrency(currency);
  const value = Number(amount);
  const safe = Number.isFinite(value) ? value : 0;

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(safe);
  } catch {
    return `${code} ${safe.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }
}
