import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PublicUser } from "@zaminex/shared";
import { queryKeys } from "@/config";
import {
  fetchMe,
  loginRequest,
  logoutRequest,
  registerRequest,
  clearTokens,
} from "@/lib/auth";
import { STORAGE_KEYS } from "@/config";

interface AuthContextValue {
  user: PublicUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<PublicUser>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    referralCode?: string;
  }) => Promise<PublicUser>;
  logout: () => Promise<void>;
  /** Re-fetch the current user (e.g. after email verification). */
  refreshUser: () => Promise<PublicUser | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Boot: if we have an access token, fetch the current user.
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.accessToken);
    if (!token) {
      setIsLoading(false);
      return;
    }
    fetchMe()
      .then(setUser)
      .catch(() => clearTokens())
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await loginRequest(email, password);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(
    async (payload: {
      name: string;
      email: string;
      password: string;
      phone?: string;
      referralCode?: string;
    }) => {
      const res = await registerRequest(payload);
      setUser(res.user);
      return res.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem(STORAGE_KEYS.accessToken);
    if (!token) return null;
    const u = await fetchMe();
    setUser(u);
    return u;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

/** Re-export the query key so components can invalidate after mutations. */
export { queryKeys as authQueryKeys };