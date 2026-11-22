import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import { applyBrandTheme, clearBrandTheme } from "@/lib/brandTheme";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import type { BrandThemeRecord } from "@/types/brandTheme";

interface BrandThemeContextValue {
  brandTheme: BrandThemeRecord | null;
  loading: boolean;
  refreshBrandTheme: () => Promise<void>;
  previewBrandTheme: (theme: BrandThemeRecord) => void;
}

const BrandThemeContext = createContext<BrandThemeContextValue | undefined>(undefined);

export function BrandThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const [brandTheme, setBrandTheme] = useState<BrandThemeRecord | null>(null);
  const [loading, setLoading] = useState(false);

  const refreshBrandTheme = useCallback(async () => {
    if (!user) {
      setBrandTheme(null);
      clearBrandTheme();
      return;
    }

    setLoading(true);
    try {
      const theme = await api.getResolvedTheme();
      setBrandTheme(theme);
      applyBrandTheme(theme, resolvedTheme);
    } catch {
      clearBrandTheme();
      setBrandTheme(null);
    } finally {
      setLoading(false);
    }
  }, [user, resolvedTheme]);

  const previewBrandTheme = useCallback(
    (theme: BrandThemeRecord) => {
      applyBrandTheme(theme, resolvedTheme);
    },
    [resolvedTheme]
  );

  useEffect(() => {
    refreshBrandTheme();
  }, [refreshBrandTheme]);

  useEffect(() => {
    if (brandTheme) {
      applyBrandTheme(brandTheme, resolvedTheme);
    }
  }, [brandTheme, resolvedTheme]);

  const value = useMemo(
    () => ({
      brandTheme,
      loading,
      refreshBrandTheme,
      previewBrandTheme,
    }),
    [brandTheme, loading, refreshBrandTheme, previewBrandTheme]
  );

  return <BrandThemeContext.Provider value={value}>{children}</BrandThemeContext.Provider>;
}

export function useBrandTheme() {
  const context = useContext(BrandThemeContext);
  if (!context) {
    throw new Error("Brand theme context is unavailable.");
  }
  return context;
}
