import { api } from "./axios";
import { STORAGE_KEYS } from "@/config";
import type { PublicUser } from "@zaminex/shared";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: PublicUser;
  tokens: TokenPair;
}

/** Persist tokens from an auth response. */
export function persistTokens(tokens: TokenPair): void {
  localStorage.setItem(STORAGE_KEYS.accessToken, tokens.accessToken);
  localStorage.setItem(STORAGE_KEYS.refreshToken, tokens.refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
}

export async function loginRequest(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post<{ data: AuthResponse }>("/auth/login", { email, password });
  persistTokens(data.data.tokens);
  return data.data;
}

export async function registerRequest(payload: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  referralCode?: string;
}): Promise<AuthResponse> {
  const { data } = await api.post<{ data: AuthResponse }>("/auth/register", payload);
  persistTokens(data.data.tokens);
  return data.data;
}

export async function fetchMe(): Promise<PublicUser> {
  const { data } = await api.get<{ data: { user: PublicUser } }>("/auth/me");
  return data.data.user;
}

export async function logoutRequest(): Promise<void> {
  try {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken) ?? undefined;
    await api.post("/auth/logout", refreshToken ? { refreshToken } : undefined);
  } finally {
    clearTokens();
  }
}

/** Verify an email using a token issued at registration or resend. */
export async function verifyEmailRequest(token: string): Promise<PublicUser> {
  const { data } = await api.post<{ data: { user: PublicUser } }>("/auth/verify-email", { token });
  return data.data.user;
}

/** Resend the verification email. Always resolves (never leaks account existence). */
export async function resendVerificationRequest(email: string): Promise<void> {
  await api.post("/auth/resend-verification", { email });
}