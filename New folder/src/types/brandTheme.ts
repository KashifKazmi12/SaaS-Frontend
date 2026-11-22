export type ThemeColorKey =
  | "primary"
  | "primaryForeground"
  | "secondary"
  | "secondaryForeground"
  | "accent"
  | "accentForeground"
  | "background"
  | "foreground"
  | "destructive"
  | "border"
  | "ring"
  | "sidebar"
  | "sidebarPrimary"
  | "sidebarPrimaryForeground";

export type ThemeColorGroup = Record<ThemeColorKey, string>;

export interface BrandThemeRecord {
  _id: string;
  user: { _id: string; name: string } | null;
  name: string;
  light: ThemeColorGroup;
  dark: ThemeColorGroup;
  isDefault: boolean;
}

export const THEME_COLOR_KEYS: ThemeColorKey[] = [
  "primary",
  "primaryForeground",
  "secondary",
  "secondaryForeground",
  "accent",
  "accentForeground",
  "background",
  "foreground",
  "destructive",
  "border",
  "ring",
  "sidebar",
  "sidebarPrimary",
  "sidebarPrimaryForeground",
];

export const THEME_COLOR_LABELS: Record<ThemeColorKey, string> = {
  primary: "Primary",
  primaryForeground: "Primary text",
  secondary: "Secondary",
  secondaryForeground: "Secondary text",
  accent: "Accent",
  accentForeground: "Accent text",
  background: "Background",
  foreground: "Text",
  destructive: "Destructive",
  border: "Border",
  ring: "Focus ring",
  sidebar: "Sidebar",
  sidebarPrimary: "Sidebar primary",
  sidebarPrimaryForeground: "Sidebar primary text",
};

export const DEFAULT_LIGHT_COLORS: ThemeColorGroup = {
  primary: "#171717",
  primaryForeground: "#fafafa",
  secondary: "#f5f5f5",
  secondaryForeground: "#171717",
  accent: "#f5f5f5",
  accentForeground: "#171717",
  background: "#ffffff",
  foreground: "#0a0a0a",
  destructive: "#dc2626",
  border: "#e5e5e5",
  ring: "#a3a3a3",
  sidebar: "#fafafa",
  sidebarPrimary: "#171717",
  sidebarPrimaryForeground: "#fafafa",
};

export const DEFAULT_DARK_COLORS: ThemeColorGroup = {
  primary: "#fafafa",
  primaryForeground: "#171717",
  secondary: "#262626",
  secondaryForeground: "#fafafa",
  accent: "#262626",
  accentForeground: "#fafafa",
  background: "#0a0a0a",
  foreground: "#fafafa",
  destructive: "#ef4444",
  border: "#333333",
  ring: "#737373",
  sidebar: "#171717",
  sidebarPrimary: "#6366f1",
  sidebarPrimaryForeground: "#fafafa",
};

export function createEmptyThemeDraft(): { light: ThemeColorGroup; dark: ThemeColorGroup } {
  return {
    light: { ...DEFAULT_LIGHT_COLORS },
    dark: { ...DEFAULT_DARK_COLORS },
  };
}
