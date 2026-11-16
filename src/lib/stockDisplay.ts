import { PRODUCT_UNIT_LABELS, normalizeProductUnit } from "@/constants/catalog";
import type { ProductPackaging } from "@/types";

function unitLabel(unit: string) {
  const normalized = normalizeProductUnit(unit || "piece");
  return PRODUCT_UNIT_LABELS[normalized] || unit || "piece";
}

/**
 * Break a base-unit quantity into largest packagings first.
 * Example: 152 with block=100, pack=50 → "1 Block 1 Pack 2 Piece"
 */
export function formatStockBreakdown(
  quantity: number,
  baseUnit = "piece",
  packagings: ProductPackaging[] | null | undefined = []
): string {
  let remaining = Number(quantity);
  if (!Number.isFinite(remaining)) remaining = 0;
  // Keep whole counts for pack breakdown; allow fractional leftover base qty.
  const whole = Math.max(0, Math.floor(remaining));
  let leftover = remaining - whole;
  remaining = whole;

  const packs = (packagings || [])
    .map((row) => ({
      unit: String(row.unit || "").trim(),
      factor: Number(row.factorToBase) || 0,
    }))
    .filter((row) => row.unit && row.factor > 1)
    .sort((a, b) => b.factor - a.factor);

  const seen = new Set<string>();
  const parts: string[] = [];

  for (const pack of packs) {
    const key = normalizeProductUnit(pack.unit);
    if (seen.has(key)) continue;
    seen.add(key);
    const count = Math.floor(remaining / pack.factor);
    if (count <= 0) continue;
    parts.push(`${count} ${unitLabel(pack.unit)}`);
    remaining -= count * pack.factor;
  }

  const baseAmount = remaining + leftover;
  if (baseAmount > 0 || parts.length === 0) {
    const shown =
      Number.isInteger(baseAmount) || Math.abs(baseAmount - Math.round(baseAmount)) < 1e-9
        ? String(Math.round(baseAmount))
        : String(Math.round(baseAmount * 1000) / 1000);
    parts.push(`${shown} ${unitLabel(baseUnit)}`);
  }

  return parts.join(" ");
}
