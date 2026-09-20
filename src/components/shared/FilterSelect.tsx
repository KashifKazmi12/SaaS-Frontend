import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const selected = options.find((option) => option.value === value);

  return (
    <Select
      value={value}
      onValueChange={(nextValue) => {
        if (nextValue) onValueChange(nextValue);
      }}
      items={options}
    >
      <SelectTrigger id={id} className={cn("w-full sm:w-44", className)}>
        <SelectValue placeholder={placeholder}>
          {selected?.label || null}
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
  );
}
