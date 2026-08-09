import { useBusinessGroupOptions } from "@/hooks/useBusinessGroupOptions";
import { FieldLabel } from "@/components/shared/FormField";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BusinessGroupRecord } from "@/types";

export interface BusinessGroupSelectProps {
  value: string;
  onValueChange?: (value: string) => void;
  groups?: BusinessGroupRecord[];
  readOnly?: boolean;
  label?: string;
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
  className?: string;
  id?: string;
  required?: boolean;
}

export function BusinessGroupSelect({
  value,
  onValueChange,
  groups,
  readOnly = false,
  label = "Business group",
  placeholder = "Select business group",
  allowEmpty = true,
  emptyLabel = "No group",
  className,
  id = "business-group-select",
  required = false,
}: BusinessGroupSelectProps) {
  const { options, loading, error, getLabel } = useBusinessGroupOptions({ groups });

  const displayName = value ? getLabel(value) : emptyLabel;

  return (
    <div className={className}>
      <div className="space-y-2">
        <FieldLabel htmlFor={id} required={required && !allowEmpty}>
          {label}
        </FieldLabel>

        {readOnly ? (
          <Input id={id} value={displayName || "—"} disabled />
        ) : loading ? (
          <Input id={id} value="Loading business groups..." disabled />
        ) : error ? (
          <Input id={id} value={error} disabled aria-invalid />
        ) : (
          <Select
            value={value}
            onValueChange={(nextValue) => onValueChange?.(nextValue ?? "")}
            items={[
              ...(allowEmpty ? [{ value: "", label: emptyLabel }] : []),
              ...options.map((option) => ({ value: option.id, label: option.name })),
            ]}
          >
            <SelectTrigger id={id} className="w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {allowEmpty && (
                <SelectItem value="">{emptyLabel}</SelectItem>
              )}
              {options.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
