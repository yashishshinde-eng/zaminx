import { api } from "./axios";
import type { PublicUser } from "@zaminex/shared";

/** PUT /profile — personal details. */
export async function updateProfileRequest(payload: {
  name: string;
  phone?: string;
}): Promise<PublicUser> {
  const { data } = await api.put<{ data: { user: PublicUser } }>("/profile", payload);
  return data.data.user;
}

/** PUT /profile/wallet-addresses — USDT-BEP20 address (empty clears). */
export async function updateWalletAddressesRequest(payload: {
  usdtBep20?: string;
}): Promise<PublicUser> {
  const { data } = await api.put<{ data: { user: PublicUser } }>("/profile/wallet-addresses", payload);
  return data.data.user;
}

/** PUT /profile/password — change password. */
export async function changePasswordRequest(payload: {
  currentPassword: string;
  password: string;
}): Promise<void> {
  await api.put("/profile/password", payload);
}

/** PUT /profile/theme — persist theme preference. */
export async function updateThemeRequest(theme: "light" | "dark"): Promise<void> {
  await api.put("/profile/theme", { theme });
}

/** PUT /profile/notifications — notification channel preferences. */
export async function updateNotificationPreferenceRequest(payload: {
  email: boolean;
  dashboard: boolean;
}): Promise<PublicUser> {
  const { data } = await api.put<{ data: { user: PublicUser } }>("/profile/notifications", payload);
  return data.data.user;
}