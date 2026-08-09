import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { PageShell } from "@/components/layout/PageShell";
import { ThemeColorEditor } from "@/components/theme/ThemeColorEditor";
import { ThemePresetPicker } from "@/components/theme/ThemePresetPicker";
import { findMatchingPreset, type ThemePreset } from "@/constants/themePresets";
import { useAuth } from "@/context/AuthContext";
import { useBrandTheme } from "@/context/BrandThemeContext";
import { PageAlerts, useConfirm } from "@/components/shared";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  createEmptyThemeDraft,
  type BrandThemeRecord,
  type ThemeColorGroup,
  type ThemeColorKey,
} from "@/types/brandTheme";

export default function ThemeSettingsPage() {
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const { previewBrandTheme, refreshBrandTheme } = useBrandTheme();
  const [hasCustomTheme, setHasCustomTheme] = useState(false);
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [draft, setDraft] = useState(createEmptyThemeDraft());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const matchedPresetId = useMemo(
    () => findMatchingPreset(draft.light, draft.dark)?.id ?? null,
    [draft.dark, draft.light]
  );

  const previewTheme = useMemo<BrandThemeRecord>(
    () => ({
      _id: "preview",
      user: user ? { _id: user.id, name: user.name } : null,
      name: hasCustomTheme ? "Custom" : "Default",
      light: draft.light,
      dark: draft.dark,
      isDefault: !hasCustomTheme,
    }),
    [draft.dark, draft.light, hasCustomTheme, user]
  );

  async function loadTheme() {
    setLoading(true);
    setError("");
    try {
      const [theme, status] = await Promise.all([api.getMyTheme(), api.getMyThemeStatus()]);
      setDraft({
        light: { ...theme.light },
        dark: { ...theme.dark },
      });
      setHasCustomTheme(status.hasCustomTheme);
      previewBrandTheme(theme);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load your theme.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTheme();
  }, []);

  useEffect(() => {
    previewBrandTheme(previewTheme);
  }, [previewTheme, previewBrandTheme]);

  useEffect(() => {
    return () => {
      refreshBrandTheme();
    };
  }, [refreshBrandTheme]);

  function updateColor(group: "light" | "dark", key: ThemeColorKey, value: string) {
    setDraft((current) => ({
      ...current,
      [group]: {
        ...current[group],
        [key]: value,
      },
    }));
  }

  function handleApplyPreset(preset: ThemePreset) {
    setDraft({
      light: { ...preset.light },
      dark: { ...preset.dark },
    });
    setMessage("");
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await api.updateMyTheme({ light: draft.light, dark: draft.dark });
      setHasCustomTheme(true);
      setMessage("Your theme has been saved.");
      await refreshBrandTheme();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save your theme.");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetTheme() {
    const confirmed = await confirm({
      title: "Reset to default theme?",
      description: "Your saved colors will be removed and the default theme will be used.",
      confirmLabel: "Reset theme",
      variant: "destructive",
    });
    if (!confirmed) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await api.deleteMyTheme();
      setMessage("Theme reset to default.");
      await loadTheme();
      await refreshBrandTheme();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset your theme.");
    } finally {
      setSaving(false);
    }
  }

  const currentColors: ThemeColorGroup = mode === "light" ? draft.light : draft.dark;

  return (
    <PageShell>
      <PageAlerts error={error} message={message} />

      {!hasCustomTheme && !loading && (
        <Alert>
          <AlertDescription>
            You are using the default theme. Pick a preset or customize colors, then save.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border p-1">
          <Button
            type="button"
            variant={mode === "light" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("light")}
          >
            Light mode
          </Button>
          <Button
            type="button"
            variant={mode === "dark" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("dark")}
          >
            Dark mode
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {hasCustomTheme && (
            <Button type="button" variant="outline" disabled={saving} onClick={handleResetTheme}>
              Use default theme
            </Button>
          )}
          <Button type="button" disabled={saving || loading} onClick={handleSave}>
            {saving ? "Saving..." : "Save my theme"}
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading your theme...</p>
      ) : (
        <>
          <ThemePresetPicker selectedPresetId={matchedPresetId} onSelect={handleApplyPreset} />

          {!matchedPresetId && (
            <p className="text-sm text-muted-foreground">
              Custom theme — adjust individual colors below or pick a recommended preset above.
            </p>
          )}

          <ThemeColorEditor
            title={mode === "light" ? "Custom light mode colors" : "Custom dark mode colors"}
            colors={currentColors}
            onChange={(key, value) => updateColor(mode, key, value)}
          />
        </>
      )}
    </PageShell>
  );
}
