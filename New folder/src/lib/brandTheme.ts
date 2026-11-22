import type { BrandThemeRecord, ThemeColorGroup, ThemeColorKey } from "@/types/brandTheme";
import { THEME_COLOR_KEYS } from "@/types/brandTheme";

const CSS_VAR_MAP: Record<ThemeColorKey, string> = {
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  secondary: "--secondary",
  secondaryForeground: "--secondary-foreground",
  accent: "--accent",
  accentForeground: "--accent-foreground",
  background: "--background",
  foreground: "--foreground",
  destructive: "--destructive",
  border: "--border",
  ring: "--ring",
  sidebar: "--sidebar",
  sidebarPrimary: "--sidebar-primary",
  sidebarPrimaryForeground: "--sidebar-primary-foreground",
};

const DERIVED_SIDEBAR_VARS = [
  "--sidebar-foreground",
  "--sidebar-accent",
  "--sidebar-accent-foreground",
  "--sidebar-border",
] as const;

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;

  const value = normalized.slice(1);
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function toHex(r: number, g: number, b: number): string {
  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, "0");

  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0.5;

  const channels = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function adjustHexBrightness(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  return toHex(rgb.r + amount, rgb.g + amount, rgb.b + amount);
}

function getContrastingForeground(hex: string): string {
  return getRelativeLuminance(hex) > 0.45 ? "#0f172a" : "#f8fafc";
}

function getSidebarAccent(sidebarHex: string): string {
  const isLight = getRelativeLuminance(sidebarHex) > 0.45;
  return adjustHexBrightness(sidebarHex, isLight ? -14 : 24);
}

function getSidebarBorder(sidebarHex: string): string {
  const isLight = getRelativeLuminance(sidebarHex) > 0.45;
  return adjustHexBrightness(sidebarHex, isLight ? -24 : 36);
}

function applyDerivedSidebarColors(colors: ThemeColorGroup) {
  const root = document.documentElement;
  const sidebar = colors.sidebar;
  const sidebarForeground = getContrastingForeground(sidebar);

  root.style.setProperty("--sidebar-foreground", sidebarForeground);
  root.style.setProperty("--sidebar-accent", getSidebarAccent(sidebar));
  root.style.setProperty("--sidebar-accent-foreground", sidebarForeground);
  root.style.setProperty("--sidebar-border", getSidebarBorder(sidebar));
}

export function applyBrandColors(colors: ThemeColorGroup) {
  const root = document.documentElement;
  for (const key of THEME_COLOR_KEYS) {
    root.style.setProperty(CSS_VAR_MAP[key], colors[key]);
  }
  applyDerivedSidebarColors(colors);
}

export function applyBrandTheme(theme: BrandThemeRecord, mode: "light" | "dark") {
  applyBrandColors(mode === "dark" ? theme.dark : theme.light);
}

export function clearBrandTheme() {
  const root = document.documentElement;
  for (const key of THEME_COLOR_KEYS) {
    root.style.removeProperty(CSS_VAR_MAP[key]);
  }
  for (const cssVar of DERIVED_SIDEBAR_VARS) {
    root.style.removeProperty(cssVar);
  }
}

export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const hex = trimmed.slice(1);
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toLowerCase();
  }
  return null;
}
