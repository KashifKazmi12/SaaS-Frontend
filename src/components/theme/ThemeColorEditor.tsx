import { ColorPickerField } from "@/components/shared/ColorPickerField";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  THEME_COLOR_KEYS,
  THEME_COLOR_LABELS,
  type ThemeColorGroup,
  type ThemeColorKey,
} from "@/types/brandTheme";

interface ThemeColorEditorProps {
  title: string;
  colors: ThemeColorGroup;
  onChange: (key: ThemeColorKey, value: string) => void;
}

export function ThemeColorEditor({ title, colors, onChange }: ThemeColorEditorProps) {
  return (
    <Card>
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
        {THEME_COLOR_KEYS.map((key) => (
          <ColorPickerField
            key={key}
            id={`theme-${title}-${key}`}
            label={THEME_COLOR_LABELS[key]}
            value={colors[key]}
            onChange={(value) => onChange(key, value)}
          />
        ))}
      </CardContent>
    </Card>
  );
}
