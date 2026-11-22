import {
  FormCheckboxField,
  FormField,
} from "@/components/shared";
import { DEFAULT_LOYALTY } from "@/constants/loyalty";

export interface LoyaltyFormState {
  loyaltyEnabled: boolean;
  earnPointsPerCurrency: string;
  redeemPointsPerCurrency: string;
  minOrderToRedeem: string;
  maxPointsPercent: string;
  minPointsToRedeem: string;
}

export function emptyLoyaltyForm(): LoyaltyFormState {
  return {
    loyaltyEnabled: DEFAULT_LOYALTY.loyaltyEnabled,
    earnPointsPerCurrency: String(DEFAULT_LOYALTY.earnPointsPerCurrency),
    redeemPointsPerCurrency: String(DEFAULT_LOYALTY.redeemPointsPerCurrency),
    minOrderToRedeem: String(DEFAULT_LOYALTY.minOrderToRedeem),
    maxPointsPercent: String(DEFAULT_LOYALTY.maxPointsPercent),
    minPointsToRedeem: String(DEFAULT_LOYALTY.minPointsToRedeem),
  };
}

export function loyaltyFormFromGroup(group?: {
  loyaltyEnabled?: boolean;
  earnPointsPerCurrency?: number;
  redeemPointsPerCurrency?: number;
  minOrderToRedeem?: number;
  maxPointsPercent?: number;
  minPointsToRedeem?: number;
} | null): LoyaltyFormState {
  if (!group) return emptyLoyaltyForm();
  return {
    loyaltyEnabled: group.loyaltyEnabled !== false,
    earnPointsPerCurrency: String(
      group.earnPointsPerCurrency ?? DEFAULT_LOYALTY.earnPointsPerCurrency
    ),
    redeemPointsPerCurrency: String(
      group.redeemPointsPerCurrency ?? DEFAULT_LOYALTY.redeemPointsPerCurrency
    ),
    minOrderToRedeem: String(group.minOrderToRedeem ?? DEFAULT_LOYALTY.minOrderToRedeem),
    maxPointsPercent: String(group.maxPointsPercent ?? DEFAULT_LOYALTY.maxPointsPercent),
    minPointsToRedeem: String(group.minPointsToRedeem ?? DEFAULT_LOYALTY.minPointsToRedeem),
  };
}

export function loyaltyPayloadFromForm(form: LoyaltyFormState) {
  return {
    loyaltyEnabled: form.loyaltyEnabled,
    earnPointsPerCurrency: Number(form.earnPointsPerCurrency) || 0,
    redeemPointsPerCurrency: Math.max(1, Math.floor(Number(form.redeemPointsPerCurrency) || 100)),
    minOrderToRedeem: Math.max(0, Number(form.minOrderToRedeem) || 0),
    maxPointsPercent: Math.min(100, Math.max(0, Number(form.maxPointsPercent) ?? 100)),
    minPointsToRedeem: Math.max(0, Math.floor(Number(form.minPointsToRedeem) || 0)),
  };
}

interface LoyaltySettingsFieldsProps {
  value: LoyaltyFormState;
  onChange: (patch: Partial<LoyaltyFormState>) => void;
  disabled?: boolean;
  currency?: string;
}

export function LoyaltySettingsFields({
  value,
  onChange,
  disabled = false,
  currency = "PKR",
}: LoyaltySettingsFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormCheckboxField
        id="loyalty-enabled"
        label="Enable loyalty points"
        checked={value.loyaltyEnabled}
        disabled={disabled}
        onCheckedChange={(checked) => onChange({ loyaltyEnabled: checked })}
        className="sm:col-span-2"
      />

      <FormField
        id="loyalty-earn-rate"
        type="number"
        label="Earn rate"
        value={value.earnPointsPerCurrency}
        onChange={(event) => onChange({ earnPointsPerCurrency: event.target.value })}
        disabled={disabled || !value.loyaltyEnabled}
        min={0}
        step="0.01"
        help={
          <p>
            Points earned per {currency} 1.00 of order subtotal. Credited only when the order is
            marked completed.
          </p>
        }
      />

      <FormField
        id="loyalty-redeem-rate"
        type="number"
        label="Redeem rate"
        value={value.redeemPointsPerCurrency}
        onChange={(event) => onChange({ redeemPointsPerCurrency: event.target.value })}
        disabled={disabled || !value.loyaltyEnabled}
        min={1}
        step={1}
        required
        help={
          <p>
            How many points equal {currency} 1.00 off at checkout. Example: 100 means 100 points =
            {currency} 1.00 discount.
          </p>
        }
      />

      <FormField
        id="loyalty-min-order"
        type="number"
        label="Min order to redeem"
        value={value.minOrderToRedeem}
        onChange={(event) => onChange({ minOrderToRedeem: event.target.value })}
        disabled={disabled || !value.loyaltyEnabled}
        min={0}
        step="0.01"
        help={
          <p>
            Cart subtotal must be at least this amount before points can be used. Use 0 for no
            minimum.
          </p>
        }
      />

      <FormField
        id="loyalty-max-percent"
        type="number"
        label="Max % with points"
        value={value.maxPointsPercent}
        onChange={(event) => onChange({ maxPointsPercent: event.target.value })}
        disabled={disabled || !value.loyaltyEnabled}
        min={0}
        max={100}
        step={1}
        help={
          <p>
            Maximum share of the order that can be paid with points. Example: 20 means at most 20%
            of the subtotal can be discounted by points.
          </p>
        }
      />

      <FormField
        id="loyalty-min-points"
        type="number"
        label="Min points to redeem"
        value={value.minPointsToRedeem}
        onChange={(event) => onChange({ minPointsToRedeem: event.target.value })}
        disabled={disabled || !value.loyaltyEnabled}
        min={0}
        step={1}
        containerClassName="sm:col-span-2"
        help={
          <p>
            Customer must redeem at least this many points in one checkout. Use 0 for no minimum.
          </p>
        }
      />
    </div>
  );
}
