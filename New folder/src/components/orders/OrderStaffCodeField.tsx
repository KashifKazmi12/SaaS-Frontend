import { FormField } from "@/components/shared";

type OrderStaffCodeFieldProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
  autoFocus?: boolean;
};

/** Inline staff code input for create/save when shared-login codes are required. */
export function OrderStaffCodeField({
  id = "order-staff-code",
  value,
  onChange,
  disabled,
  error,
  className,
  autoFocus,
}: OrderStaffCodeFieldProps) {
  return (
    <div className={className}>
      <FormField
        id={id}
        label="Staff code"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        disabled={disabled}
        autoComplete="off"
        autoCapitalize="characters"
        autoFocus={autoFocus}
      />
      {error ? <p className="text-destructive mt-1.5 text-sm">{error}</p> : null}
    </div>
  );
}
