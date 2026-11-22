import { EnumSelect } from "@/components/shared/EnumSelect";
import { cn } from "@/lib/utils";

export interface FilterSelectOption {
  value: string;
  label: string;
}

interface FilterSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: FilterSelectOption[];
  placeholder?: string;
  className?: string;
  id?: string;
}

export function FilterSelect({
  value,
  onValueChange,
  options,
  placeholder = "All",
  className,
  id,
}: FilterSelectProps) {
  return (
    <EnumSelect
      id={id}
      value={value}
      onValueChange={onValueChange}
      options={options}
      placeholder={placeholder}
      className={cn("w-full sm:w-44", className)}
      inputClassName="w-full"
    />
  );
}
