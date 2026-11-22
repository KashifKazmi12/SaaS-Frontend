import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeHexColor } from "@/lib/brandTheme";
import { cn } from "@/lib/utils";

interface ColorPickerFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ColorPickerField({
  id,
  label,
  value,
  onChange,
  className,
}: ColorPickerFieldProps) {
  function handleTextChange(nextValue: string) {
    onChange(nextValue);
    const normalized = normalizeHexColor(nextValue);
    if (normalized) onChange(normalized);
  }

  function handlePickerChange(nextValue: string) {
    onChange(nextValue.toLowerCase());
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={`${id}-picker`}
          type="color"
          value={normalizeHexColor(value) ?? "#000000"}
          onChange={(event) => handlePickerChange(event.target.value)}
          className="h-9 w-12 shrink-0 cursor-pointer p-1"
          aria-label={`${label} color picker`}
        />
        <Input
          id={id}
          value={value}
          onChange={(event) => handleTextChange(event.target.value)}
          placeholder="#000000"
          className="font-mono uppercase"
        />
      </div>
    </div>
  );
}
