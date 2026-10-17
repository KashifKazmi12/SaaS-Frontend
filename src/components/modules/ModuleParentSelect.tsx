import { useMemo } from "react";
import { useModuleOptions } from "@/hooks/useModuleOptions";
import { FieldLabel } from "@/components/shared/FormField";
import { EnumSelect } from "@/components/shared/EnumSelect";
import { Input } from "@/components/ui/input";
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

  const selectItems = useMemo(
    () => options.map((option) => ({ value: option.id, label: option.name })),
    [options]
  );

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
          <EnumSelect
            id={id}
            value={value}
            onValueChange={onValueChange}
            options={selectItems}
            placeholder={placeholder}
            required={required}
          />
        )}
      </div>
    </div>
  );
}
