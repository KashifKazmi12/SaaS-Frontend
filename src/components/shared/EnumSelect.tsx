import { FieldLabel } from "@/components/shared/FormField";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface EnumOption<T extends string = string> {
  value: T;
  label: string;
}

export interface EnumSelectProps<T extends string = string> {
  value: T;
  onValueChange?: (value: T) => void;
  options: EnumOption<T>[];
  label?: string;
  placeholder?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  hint?: string;
}

export function EnumSelect<T extends string = string>({
  value,
  onValueChange,
  options,
  label,
  placeholder = "Select option",
  id,
  required = false,
  disabled = false,
  readOnly = false,
  className,
  hint,
}: EnumSelectProps<T>) {
  const fieldId = id ?? "enum-select";
  const selected = options.find((option) => option.value === value);
  const displayName = selected?.label ?? value;
  const selectItems = options.map((option) => ({ value: option.value, label: option.label }));

  return (
    <div className={cn(className)}>
      <div className="space-y-2">
        {label && (
          <FieldLabel htmlFor={fieldId} required={required}>
            {label}
          </FieldLabel>
        )}

        {readOnly || disabled ? (
          <Input id={fieldId} value={displayName || "—"} disabled />
        ) : (
          <Select
            value={value}
            onValueChange={(nextValue) => {
              if (nextValue) onValueChange?.(nextValue as T);
            }}
            items={selectItems}
          >
            <SelectTrigger id={fieldId} className="w-full">
              <SelectValue placeholder={placeholder}>
                {displayName || null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}
