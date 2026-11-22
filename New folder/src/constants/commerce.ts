/** Currency is per business group. Card checkout uses platform Stripe (Settings → Payments). */

export const GROUP_CURRENCIES = ["PKR", "USD", "EUR", "GBP"] as const;
export type GroupCurrency = (typeof GROUP_CURRENCIES)[number];

export const GROUP_CURRENCY_OPTIONS = [
  { value: "PKR", label: "Pakistani Rupee (PKR)" },
  { value: "USD", label: "US Dollar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "GBP", label: "British Pound (GBP)" },
] as const;

export const CHECKOUT_PAYMENT_METHODS = ["unpaid", "cash", "bank_transfer", "stripe"] as const;
export type CheckoutPaymentMethod = (typeof CHECKOUT_PAYMENT_METHODS)[number];

export const CHECKOUT_PAYMENT_METHOD_OPTIONS: Array<{
  value: CheckoutPaymentMethod;
  label: string;
  description: string;
}> = [
  {
    value: "unpaid",
    label: "Pay later",
    description: "Place the order now and collect payment later.",
  },
  {
    value: "cash",
    label: "Cash",
    description: "Customer pays in person at this branch.",
  },
  {
    value: "bank_transfer",
    label: "Bank transfer",
    description: "Customer pays to your account. Mark the order paid when it arrives.",
  },
  {
    value: "stripe",
    label: "Pay with card",
    description: "Secure card checkout through the platform.",
  },
];

export const DEFAULT_CHECKOUT_PAYMENT_METHODS: CheckoutPaymentMethod[] = [
  ...CHECKOUT_PAYMENT_METHODS,
];

/** Admin portal create-order methods (configured separately per branch). */
export const DEFAULT_PORTAL_PAYMENT_METHODS: CheckoutPaymentMethod[] = [
  ...CHECKOUT_PAYMENT_METHODS,
];

export interface PlatformStripeSettings {
  enabled: boolean;
  publishableKey: string;
  secretKeyConfigured: boolean;
  webhookSecretConfigured: boolean;
  testMode: boolean;
  stripeReady: boolean;
}
