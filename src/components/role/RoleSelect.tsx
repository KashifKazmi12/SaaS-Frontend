import { useRoleOptions } from "@/hooks/useRoleOptions";
import { FieldLabel } from "@/components/shared/FormField";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RoleRecord } from "@/types";

export interface RoleSelectProps {
  value: string;
  onValueChange?: (value: string) => void;
  roles?: RoleRecord[];
  readOnly?: boolean;
  label?: string;
  placeholder?: string;
  className?: string;
  id?: string;
  required?: boolean;
}

export function RoleSelect({
  value,
  onValueChange,
  roles,
  readOnly = false,
  label = "Role",
  placeholder = "Select role",
  className,
  id = "role-select",
  required = false,
}: RoleSelectProps) {
  const { options, loading, error, getLabel } = useRoleOptions({ roles });

  const displayName = getLabel(value) || options.find((option) => option.id === value)?.name || "";

  return (
    <div className={className}>
      <div className="space-y-2">
        <FieldLabel htmlFor={id} required={required}>
          {label}
        </FieldLabel>

        {readOnly ? (
          <Input id={id} value={displayName || "—"} disabled />
        ) : loading ? (
          <Input id={id} value="Loading roles..." disabled />
        ) : error ? (
          <Input id={id} value={error} disabled aria-invalid />
        ) : (
          <Select
            value={value}
            onValueChange={(nextValue) => onValueChange?.(nextValue ?? "")}
            items={options.map((option) => ({ value: option.id, label: option.name }))}
          >
            <SelectTrigger id={id} className="w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
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
