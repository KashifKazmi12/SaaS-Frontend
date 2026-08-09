import {
  DEFAULT_DARK_COLORS,
  DEFAULT_LIGHT_COLORS,
  type ThemeColorGroup,
} from "@/types/brandTheme";

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  swatches: [string, string, string, string];
  light: ThemeColorGroup;
  dark: ThemeColorGroup;
}

function preset(
  id: string,
  name: string,
  description: string,
  swatches: [string, string, string, string],
  light: ThemeColorGroup,
  dark: ThemeColorGroup
): ThemePreset {
  return { id, name, description, swatches, light, dark };
}

export const THEME_PRESETS: ThemePreset[] = [
  preset(
    "classic",
    "Classic",
    "Clean neutral palette for a professional look.",
    ["#171717", "#ffffff", "#fafafa", "#f5f5f5"],
    { ...DEFAULT_LIGHT_COLORS },
    { ...DEFAULT_DARK_COLORS }
  ),
  preset(
    "ocean",
    "Ocean Blue",
    "Calm blues with crisp contrast.",
    ["#2563eb", "#ffffff", "#eff6ff", "#dbeafe"],
    {
      primary: "#2563eb",
      primaryForeground: "#ffffff",
      secondary: "#eff6ff",
      secondaryForeground: "#1e3a8a",
      accent: "#dbeafe",
      accentForeground: "#1e40af",
      background: "#ffffff",
      foreground: "#0f172a",
      destructive: "#dc2626",
      border: "#bfdbfe",
      ring: "#60a5fa",
      sidebar: "#f8fafc",
      sidebarPrimary: "#2563eb",
      sidebarPrimaryForeground: "#ffffff",
    },
    {
      primary: "#3b82f6",
      primaryForeground: "#ffffff",
      secondary: "#1e293b",
      secondaryForeground: "#e2e8f0",
      accent: "#1e3a8a",
      accentForeground: "#dbeafe",
      background: "#0b1220",
      foreground: "#f8fafc",
      destructive: "#f87171",
      border: "#1e3a8a",
      ring: "#60a5fa",
      sidebar: "#0f172a",
      sidebarPrimary: "#3b82f6",
      sidebarPrimaryForeground: "#ffffff",
    }
  ),
  preset(
    "forest",
    "Forest Green",
    "Natural greens for wellness and growth brands.",
    ["#15803d", "#ffffff", "#f0fdf4", "#dcfce7"],
    {
      primary: "#15803d",
      primaryForeground: "#ffffff",
      secondary: "#f0fdf4",
      secondaryForeground: "#14532d",
      accent: "#dcfce7",
      accentForeground: "#166534",
      background: "#ffffff",
      foreground: "#052e16",
      destructive: "#dc2626",
      border: "#bbf7d0",
      ring: "#4ade80",
      sidebar: "#f7fef9",
      sidebarPrimary: "#15803d",
      sidebarPrimaryForeground: "#ffffff",
    },
    {
      primary: "#22c55e",
      primaryForeground: "#052e16",
      secondary: "#1a2e1f",
      secondaryForeground: "#dcfce7",
      accent: "#14532d",
      accentForeground: "#bbf7d0",
      background: "#071a0f",
      foreground: "#ecfdf5",
      destructive: "#f87171",
      border: "#166534",
      ring: "#4ade80",
      sidebar: "#0f2418",
      sidebarPrimary: "#22c55e",
      sidebarPrimaryForeground: "#052e16",
    }
  ),
  preset(
    "royal",
    "Royal Purple",
    "Bold purple accents with modern contrast.",
    ["#7c3aed", "#ffffff", "#f5f3ff", "#ede9fe"],
    {
      primary: "#7c3aed",
      primaryForeground: "#ffffff",
      secondary: "#f5f3ff",
      secondaryForeground: "#4c1d95",
      accent: "#ede9fe",
      accentForeground: "#5b21b6",
      background: "#ffffff",
      foreground: "#1e1b4b",
      destructive: "#dc2626",
      border: "#ddd6fe",
      ring: "#a78bfa",
      sidebar: "#faf5ff",
      sidebarPrimary: "#7c3aed",
      sidebarPrimaryForeground: "#ffffff",
    },
    {
      primary: "#8b5cf6",
      primaryForeground: "#ffffff",
      secondary: "#2e1065",
      secondaryForeground: "#ede9fe",
      accent: "#4c1d95",
      accentForeground: "#ddd6fe",
      background: "#120a24",
      foreground: "#f5f3ff",
      destructive: "#f87171",
      border: "#5b21b6",
      ring: "#a78bfa",
      sidebar: "#1a1033",
      sidebarPrimary: "#8b5cf6",
      sidebarPrimaryForeground: "#ffffff",
    }
  ),
  preset(
    "sunset",
    "Sunset Orange",
    "Warm oranges for energetic, friendly brands.",
    ["#ea580c", "#ffffff", "#fff7ed", "#ffedd5"],
    {
      primary: "#ea580c",
      primaryForeground: "#ffffff",
      secondary: "#fff7ed",
      secondaryForeground: "#9a3412",
      accent: "#ffedd5",
      accentForeground: "#c2410c",
      background: "#ffffff",
      foreground: "#431407",
      destructive: "#dc2626",
      border: "#fed7aa",
      ring: "#fb923c",
      sidebar: "#fffbf5",
      sidebarPrimary: "#ea580c",
      sidebarPrimaryForeground: "#ffffff",
    },
    {
      primary: "#f97316",
      primaryForeground: "#ffffff",
      secondary: "#431407",
      secondaryForeground: "#ffedd5",
      accent: "#9a3412",
      accentForeground: "#fed7aa",
      background: "#1a0f08",
      foreground: "#fff7ed",
      destructive: "#f87171",
      border: "#9a3412",
      ring: "#fb923c",
      sidebar: "#241208",
      sidebarPrimary: "#f97316",
      sidebarPrimaryForeground: "#ffffff",
    }
  ),
  preset(
    "rose",
    "Rose",
    "Soft rose tones for elegant, modern UI.",
    ["#e11d48", "#ffffff", "#fff1f2", "#ffe4e6"],
    {
      primary: "#e11d48",
      primaryForeground: "#ffffff",
      secondary: "#fff1f2",
      secondaryForeground: "#881337",
      accent: "#ffe4e6",
      accentForeground: "#be123c",
      background: "#ffffff",
      foreground: "#4c0519",
      destructive: "#dc2626",
      border: "#fecdd3",
      ring: "#fb7185",
      sidebar: "#fffafb",
      sidebarPrimary: "#e11d48",
      sidebarPrimaryForeground: "#ffffff",
    },
    {
      primary: "#f43f5e",
      primaryForeground: "#ffffff",
      secondary: "#4c0519",
      secondaryForeground: "#ffe4e6",
      accent: "#881337",
      accentForeground: "#fecdd3",
      background: "#18080e",
      foreground: "#fff1f2",
      destructive: "#f87171",
      border: "#881337",
      ring: "#fb7185",
      sidebar: "#240812",
      sidebarPrimary: "#f43f5e",
      sidebarPrimaryForeground: "#ffffff",
    }
  ),
  preset(
    "slate",
    "Slate Pro",
    "Cool slate tones for corporate dashboards.",
    ["#334155", "#ffffff", "#f8fafc", "#e2e8f0"],
    {
      primary: "#334155",
      primaryForeground: "#f8fafc",
      secondary: "#f1f5f9",
      secondaryForeground: "#0f172a",
      accent: "#e2e8f0",
      accentForeground: "#1e293b",
      background: "#ffffff",
      foreground: "#0f172a",
      destructive: "#dc2626",
      border: "#cbd5e1",
      ring: "#64748b",
      sidebar: "#f8fafc",
      sidebarPrimary: "#334155",
      sidebarPrimaryForeground: "#f8fafc",
    },
    {
      primary: "#94a3b8",
      primaryForeground: "#0f172a",
      secondary: "#1e293b",
      secondaryForeground: "#e2e8f0",
      accent: "#334155",
      accentForeground: "#cbd5e1",
      background: "#0b1120",
      foreground: "#f1f5f9",
      destructive: "#f87171",
      border: "#334155",
      ring: "#64748b",
      sidebar: "#111827",
      sidebarPrimary: "#64748b",
      sidebarPrimaryForeground: "#f8fafc",
    }
  ),
  preset(
    "midnight",
    "Midnight",
    "Deep navy sidebar with bright cyan accents.",
    ["#0891b2", "#ffffff", "#0f172a", "#ecfeff"],
    {
      primary: "#0891b2",
      primaryForeground: "#ffffff",
      secondary: "#ecfeff",
      secondaryForeground: "#155e75",
      accent: "#cffafe",
      accentForeground: "#0e7490",
      background: "#ffffff",
      foreground: "#0f172a",
      destructive: "#dc2626",
      border: "#a5f3fc",
      ring: "#22d3ee",
      sidebar: "#0f172a",
      sidebarPrimary: "#0891b2",
      sidebarPrimaryForeground: "#ffffff",
    },
    {
      primary: "#22d3ee",
      primaryForeground: "#083344",
      secondary: "#164e63",
      secondaryForeground: "#cffafe",
      accent: "#155e75",
      accentForeground: "#a5f3fc",
      background: "#020617",
      foreground: "#ecfeff",
      destructive: "#f87171",
      border: "#164e63",
      ring: "#22d3ee",
      sidebar: "#0f172a",
      sidebarPrimary: "#22d3ee",
      sidebarPrimaryForeground: "#083344",
    }
  ),
];

export function findMatchingPreset(
  light: ThemeColorGroup,
  dark: ThemeColorGroup
): ThemePreset | null {
  return (
    THEME_PRESETS.find(
      (preset) =>
        THEME_COLOR_GROUPS_EQUAL(preset.light, light) && THEME_COLOR_GROUPS_EQUAL(preset.dark, dark)
    ) ?? null
  );
}

function THEME_COLOR_GROUPS_EQUAL(a: ThemeColorGroup, b: ThemeColorGroup): boolean {
  const keys = Object.keys(a) as (keyof ThemeColorGroup)[];
  return keys.every((key) => a[key].toLowerCase() === b[key].toLowerCase());
}
