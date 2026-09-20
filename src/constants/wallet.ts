export const WALLET_ENTRY_TYPES = ["top_up", "adjust", "redeem"] as const;
export type WalletEntryType = (typeof WALLET_ENTRY_TYPES)[number];

export const WALLET_ENTRY_TYPE_OPTIONS = [
  { value: "top_up", label: "Add credit" },
  { value: "adjust", label: "Adjust" },
  { value: "redeem", label: "Redeem" },
] as const;

export function walletEntryTypeLabel(type: string) {
  return (
    WALLET_ENTRY_TYPE_OPTIONS.find((option) => option.value === type)?.label || type
  );
}
