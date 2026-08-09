import type { AuthUser } from "@/types";

type BusinessReference = { _id: string; name: string } | string | null | undefined;

export function getBusinessDisplayName(
  business: BusinessReference,
  labelById?: Record<string, string>
): string {
  if (!business) return "—";
  if (typeof business === "object") return business.name;
  return labelById?.[business] ?? "—";
}

export function formatAssignedBusinesses(
  businesses: { id?: string; _id?: string; name: string }[] | undefined,
  emptyLabel = "No businesses"
): string {
  if (!businesses?.length) return emptyLabel;
  return businesses.map((business) => business.name).join(", ");
}

export function shouldSendBusinessIdOnCreate(user: AuthUser | null): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  return user.businesses.length > 1;
}
