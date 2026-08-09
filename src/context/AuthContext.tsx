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
import type { AuthUser, NavItem, Permission } from "@/types";

interface AuthContextValue {
  user: AuthUser | null;
  navigation: NavItem[];
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updateProfile: (payload: Record<string, unknown>) => Promise<void>;
  can: (path: string, action: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [navigation, setNavigation] = useState<NavItem[]>([]);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback(
    (nextUser: AuthUser, nextNavigation: NavItem[]) => {
      setUser(nextUser);
      setNavigation(nextNavigation);
    },
    []
  );

  const refreshSession = useCallback(async () => {
    const data = await api.me();
    applySession(data.user, data.navigation);
  }, [applySession]);

  useEffect(() => {
    api
      .me()
      .then((data) => applySession(data.user, data.navigation))
      .catch(() => {
        setUser(null);
        setNavigation([]);
      })
      .finally(() => setLoading(false));
  }, [applySession]);

  const signIn = useCallback(
    async (username: string, password: string) => {
      const data = await api.login(username, password);
      applySession(data.user, data.navigation);
    },
    [applySession]
  );

  const signOut = useCallback(async () => {
    await api.logout();
    setUser(null);
    setNavigation([]);
  }, []);

  const updateProfile = useCallback(
    async (payload: Record<string, unknown>) => {
      const data = await api.updateProfile(payload);
      applySession(data.user, data.navigation);
    },
    [applySession]
  );

  const can = useCallback(
    (path: string, action: Permission) => {
      if (!user) return false;
      if (user.isSuperAdmin) return true;

      for (const item of navigation) {
        if (item.path === path) {
          return item.permissions.includes(action);
        }
        for (const child of item.children) {
          if (child.path === path) {
            return child.permissions.includes(action);
          }
        }
      }

      return false;
    },
    [navigation, user]
  );

  const value = useMemo(
    () => ({
      user,
      navigation,
      loading,
      signIn,
      signOut,
      refreshSession,
      updateProfile,
      can,
    }),
    [user, navigation, loading, signIn, signOut, refreshSession, updateProfile, can]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("Auth context is unavailable.");
  }
  return context;
}
