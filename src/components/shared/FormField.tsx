import type { ComponentProps, ReactNode } from "react";
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
}

export function FormField({
  label,
  id,
  containerClassName,
  className,
  required,
  ...inputProps
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", containerClassName)}>
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      <Input id={id} className={className} required={required} {...inputProps} />
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
}

export function FormCheckboxField({
  id,
  label,
  checked,
  onCheckedChange,
  className,
  required,
}: FormCheckboxFieldProps) {
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Checkbox
        id={fieldId}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(Boolean(value))}
      />
      <FieldLabel htmlFor={fieldId} required={required}>
        {label}
      </FieldLabel>
    </div>
  );
}
