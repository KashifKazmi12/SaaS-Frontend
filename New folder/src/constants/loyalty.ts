export const DEFAULT_LOYALTY = {
  loyaltyEnabled: true,
  earnPointsPerCurrency: 1,
  redeemPointsPerCurrency: 100,
  minOrderToRedeem: 0,
  maxPointsPercent: 100,
  minPointsToRedeem: 0,
} as const;

export type LoyaltySettings = {
  loyaltyEnabled: boolean;
  earnPointsPerCurrency: number;
  redeemPointsPerCurrency: number;
  minOrderToRedeem: number;
  maxPointsPercent: number;
  minPointsToRedeem: number;
};

export const POINTS_ENTRY_TYPES = ["earn", "adjust", "redeem"] as const;
export type PointsEntryType = (typeof POINTS_ENTRY_TYPES)[number];

export const POINTS_ENTRY_TYPE_OPTIONS = [
  { value: "earn", label: "Earn" },
  { value: "adjust", label: "Adjust" },
  { value: "redeem", label: "Redeem" },
] as const;

export function pointsEntryTypeLabel(type: string) {
  return (
    POINTS_ENTRY_TYPE_OPTIONS.find((option) => option.value === type)?.label || type
  );
}

function roundMoney(value: number) {
  return Math.round(Number(value) * 100) / 100;
}

export function resolveLoyaltySettings(
  source?: Partial<LoyaltySettings> | null
): LoyaltySettings {
  const src = source || {};
  return {
    loyaltyEnabled: src.loyaltyEnabled !== false,
    earnPointsPerCurrency: Math.max(
      0,
      Number(src.earnPointsPerCurrency) || DEFAULT_LOYALTY.earnPointsPerCurrency
    ),
    redeemPointsPerCurrency: Math.max(
      1,
      Math.floor(
        Number(src.redeemPointsPerCurrency) || DEFAULT_LOYALTY.redeemPointsPerCurrency
      )
    ),
    minOrderToRedeem: Math.max(0, roundMoney(Number(src.minOrderToRedeem) || 0)),
    maxPointsPercent: Math.min(
      100,
      Math.max(0, Number(src.maxPointsPercent) ?? DEFAULT_LOYALTY.maxPointsPercent)
    ),
    minPointsToRedeem: Math.max(0, Math.floor(Number(src.minPointsToRedeem) || 0)),
  };
}

export function pointsToMoney(
  points: number,
  redeemPointsPerCurrency: number = DEFAULT_LOYALTY.redeemPointsPerCurrency
) {
  const rate = Math.max(1, Math.floor(Number(redeemPointsPerCurrency) || 100));
  const pts = Math.max(0, Math.floor(Number(points) || 0));
  return roundMoney(pts / rate);
}

export function moneyToRedeemablePoints(
  money: number,
  redeemPointsPerCurrency: number = DEFAULT_LOYALTY.redeemPointsPerCurrency
) {
  const rate = Math.max(1, Math.floor(Number(redeemPointsPerCurrency) || 100));
  const amount = Math.max(0, Number(money) || 0);
  return Math.floor(amount * rate);
}

export function earnPointsFromSubtotal(
  subtotal: number,
  earnPointsPerCurrency: number = DEFAULT_LOYALTY.earnPointsPerCurrency
) {
  const rate = Math.max(0, Number(earnPointsPerCurrency) || 0);
  return Math.floor(Math.max(0, Number(subtotal) || 0) * rate);
}

export function maxRedeemablePointsForOrder(
  subtotal: number,
  loyalty?: Partial<LoyaltySettings> | null
) {
  const settings = resolveLoyaltySettings(loyalty);
  if (!settings.loyaltyEnabled) return 0;
  if (subtotal < settings.minOrderToRedeem) return 0;
  const maxByMoney = moneyToRedeemablePoints(subtotal, settings.redeemPointsPerCurrency);
  const maxDiscount = roundMoney((subtotal * settings.maxPointsPercent) / 100);
  const maxByPercent = moneyToRedeemablePoints(maxDiscount, settings.redeemPointsPerCurrency);
  return Math.max(0, Math.min(maxByMoney, maxByPercent));
}

/** @deprecated use redeemPointsPerCurrency from group settings */
export const POINTS_PER_CURRENCY_UNIT = DEFAULT_LOYALTY.redeemPointsPerCurrency;
/** @deprecated use earnPointsPerCurrency from group settings */
export const EARN_POINTS_PER_CURRENCY_UNIT = DEFAULT_LOYALTY.earnPointsPerCurrency;
