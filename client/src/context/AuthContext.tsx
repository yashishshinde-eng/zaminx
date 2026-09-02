import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { PublicUser } from "@zeminex/shared";
import { queryKeys } from "@/config";
import {
  fetchMe,
  loginRequest,
  logoutRequest,
  registerRequest,
  clearTokens,
  persistTokens,
} from "@/lib/auth";
import type { TokenPair } from "@/lib/auth";
import { STORAGE_KEYS } from "@/config";

interface AuthContextValue {
  user: PublicUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** True while an admin is signed in as another user via impersonation. */
  isImpersonating: boolean;
  login: (email: string, password: string) => Promise<PublicUser>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    countryCode: string;
    transactionPassword: string;
    referralCode?: string;
  }) => Promise<PublicUser>;
  logout: () => Promise<void>;
  /** Re-fetch the current user (e.g. after email verification). */
  refreshUser: () => Promise<PublicUser | null>;
  /** Switch the session to a target user (admin impersonation). Stashes the
   *  admin's real tokens + user the first time so they can be restored. */
  loginAs: (targetUser: PublicUser, tokens: TokenPair) => void;
  /** Restore the stashed admin session, ending impersonation. */
  endImpersonation: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(
    () => !!localStorage.getItem(STORAGE_KEYS.impersonationAccessToken),
  );
  const qc = useQueryClient();

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
      countryCode: string;
      transactionPassword: string;
      referralCode?: string;
    }) => {
      const res = await registerRequest(payload);
      // Do NOT set the user — the registration flow shows a credentials popup
      // and then redirects to the login page for manual authentication.
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

  // Admin impersonation: stash the admin's real session the first time we
  // enter impersonation, then install the target's tokens + user.
  const loginAs = useCallback(
    (targetUser: PublicUser, tokens: TokenPair) => {
      if (!localStorage.getItem(STORAGE_KEYS.impersonationAccessToken)) {
        const adminAt = localStorage.getItem(STORAGE_KEYS.accessToken);
        const adminRt = localStorage.getItem(STORAGE_KEYS.refreshToken);
        if (adminAt) localStorage.setItem(STORAGE_KEYS.impersonationAccessToken, adminAt);
        if (adminRt) localStorage.setItem(STORAGE_KEYS.impersonationRefreshToken, adminRt);
        if (user) localStorage.setItem(STORAGE_KEYS.impersonationUser, JSON.stringify(user));
      }
      persistTokens(tokens);
      setUser(targetUser);
      setIsImpersonating(true);
      // Drop cached queries from the admin session so the impersonated user
      // sees their own dashboard/wallet/etc. instead of stale admin data.
      qc.clear();
    },
    [user, qc],
  );

  // Restore the stashed admin session, ending impersonation. If there is no
  // stash (e.g. the imp keys were cleared out of band), drop the session.
  const endImpersonation = useCallback(() => {
    const adminAt = localStorage.getItem(STORAGE_KEYS.impersonationAccessToken);
    const adminRt = localStorage.getItem(STORAGE_KEYS.impersonationRefreshToken);
    const adminUserJson = localStorage.getItem(STORAGE_KEYS.impersonationUser);
    localStorage.removeItem(STORAGE_KEYS.impersonationAccessToken);
    localStorage.removeItem(STORAGE_KEYS.impersonationRefreshToken);
    localStorage.removeItem(STORAGE_KEYS.impersonationUser);
    if (adminAt && adminRt) {
      persistTokens({ accessToken: adminAt, refreshToken: adminRt });
      setUser(adminUserJson ? (JSON.parse(adminUserJson) as PublicUser) : null);
    } else {
      clearTokens();
      setUser(null);
    }
    setIsImpersonating(false);
    // Drop cached queries from the impersonated session before the admin
    // views re-populate with admin-scoped data.
    qc.clear();
  }, [qc]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      isImpersonating,
      login,
      register,
      logout,
      refreshUser,
      loginAs,
      endImpersonation,
    }),
    [user, isLoading, isImpersonating, login, register, logout, refreshUser, loginAs, endImpersonation],
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