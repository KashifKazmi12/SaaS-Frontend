import { THEME_PRESETS, type ThemePreset } from "@/constants/themePresets";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ThemePresetPickerProps {
  selectedPresetId: string | null;
  onSelect: (preset: ThemePreset) => void;
  disabled?: boolean;
}

export function ThemePresetPicker({
  selectedPresetId,
  onSelect,
  disabled = false,
}: ThemePresetPickerProps) {
  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-base">Recommended themes</CardTitle>
        <CardDescription>
          Click a preset to apply light and dark colors instantly. Save when you are happy with the
          result, or fine-tune below.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-4">
        {THEME_PRESETS.map((preset) => {
          const isSelected = selectedPresetId === preset.id;

          return (
            <button
              key={preset.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(preset)}
              className={cn(
                "group flex flex-col rounded-xl border bg-card p-3 text-left transition-colors",
                "hover:border-primary/50 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected && "border-primary ring-2 ring-primary/20",
                disabled && "cursor-not-allowed opacity-60"
              )}
            >
              <div className="mb-3 flex h-10 overflow-hidden rounded-md border">
                {preset.swatches.map((color, index) => (
                  <span
                    key={`${preset.id}-${index}`}
                    className="h-full flex-1"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span className="text-sm font-medium">{preset.name}</span>
              <span className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {preset.description}
              </span>
              {isSelected && (
                <span className="mt-2 text-xs font-medium text-primary">Applied</span>
              )}
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
