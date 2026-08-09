import { useModuleOptions } from "@/hooks/useModuleOptions";
import { FieldLabel } from "@/components/shared/FormField";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ModuleRecord } from "@/types";

export interface ModuleParentSelectProps {
  value: string;
  onValueChange?: (value: string) => void;
  modules: ModuleRecord[];
  readOnly?: boolean;
  label?: string;
  placeholder?: string;
  className?: string;
  id?: string;
  required?: boolean;
}

export function ModuleParentSelect({
  value,
  onValueChange,
  modules,
  readOnly = false,
  label = "Parent section",
  placeholder = "Select parent section",
  className,
  id = "module-parent-select",
  required = false,
}: ModuleParentSelectProps) {
  const { options, getLabel } = useModuleOptions({ modules, parentOnly: true });

  const displayName = getLabel(value) || options.find((option) => option.id === value)?.name || "";

  return (
    <div className={className}>
      <div className="space-y-2">
        <FieldLabel htmlFor={id} required={required}>
          {label}
        </FieldLabel>

        {readOnly ? (
          <Input id={id} value={displayName || "—"} disabled />
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
