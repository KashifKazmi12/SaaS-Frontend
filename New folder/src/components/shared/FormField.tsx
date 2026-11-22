import type { ReactNode } from "react";
import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { FieldHelp } from "@/components/shared/FieldHelp";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldLabelProps {
  children: ReactNode;
  required?: boolean;
  htmlFor?: string;
  className?: string;
}

export function FieldLabel({ children, required, htmlFor, className }: FieldLabelProps) {
  return (
    <Label htmlFor={htmlFor} className={className}>
      {children}
      {required && (
        <span className="text-destructive" aria-hidden="true">
          *
        </span>
      )}
    </Label>
  );
}

interface FormFieldProps extends ComponentProps<typeof Input> {
  label: string;
  containerClassName?: string;
  /** Short tooltip — only for fields that need explanation. */
  help?: ReactNode;
  helpLabel?: string;
}

export function FormField({
  label,
  id,
  containerClassName,
  className,
  required,
  type,
  help,
  helpLabel,
  ...inputProps
}: FormFieldProps) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (visible ? "text" : "password") : type;

  return (
    <div className={cn("space-y-2", containerClassName)}>
      <div className="flex items-center gap-1.5">
        <FieldLabel htmlFor={id} required={required}>
          {label}
        </FieldLabel>
        {help ? <FieldHelp label={helpLabel || `About ${label}`}>{help}</FieldHelp> : null}
      </div>
      <div className={cn(isPassword && "relative")}>
        <Input
          id={id}
          type={inputType}
          className={cn(isPassword && "pr-9", className)}
          required={required}
          {...inputProps}
        />
        {isPassword ? (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {visible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
        ) : null}
      </div>
    </div>
  );
}

interface FormCheckboxFieldProps {
  id?: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  help?: ReactNode;
  helpLabel?: string;
}

export function FormCheckboxField({
  id,
  label,
  checked,
  onCheckedChange,
  className,
  required,
  disabled,
  help,
  helpLabel,
}: FormCheckboxFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Checkbox
        id={fieldId}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onCheckedChange(Boolean(value))}
      />
      <div className="flex items-center gap-1.5">
        <FieldLabel htmlFor={fieldId} required={required}>
          {label}
        </FieldLabel>
        {help ? <FieldHelp label={helpLabel || `About ${label}`}>{help}</FieldHelp> : null}
      </div>
    </div>
  );
}
