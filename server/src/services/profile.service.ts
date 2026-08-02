import { User, ActivityLog, type UserDocument } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { toPublicUser } from "./auth.service.js";
import type { PublicUser } from "@zaminex/shared";

async function loadUser(userId: string): Promise<UserDocument> {
  const user = await User.findById(userId).select("+passwordHash");
  if (!user) throw ApiError.notFound("User not found");
  return user;
}

async function logActivity(userId: string, action: string, ip?: string, userAgent?: string) {
  await ActivityLog.create({ actor: userId, action, ip, userAgent }).catch(() => undefined);
}

/** PUT /profile — update personal details (name + phone). */
export async function updateProfile(
  userId: string,
  input: { name: string; phone?: string },
  meta?: { ip?: string; userAgent?: string },
): Promise<PublicUser> {
  const user = await loadUser(userId);
  user.name = input.name;
  user.phone = input.phone ?? "";
  await user.save();
  await logActivity(userId, "profile.update", meta?.ip, meta?.userAgent);
  return toPublicUser(user);
}

/** PUT /profile/wallet-addresses — store the user's USDT-BEP20 address (empty clears). */
export async function updateWalletAddresses(
  userId: string,
  input: { usdtBep20?: string },
  meta?: { ip?: string; userAgent?: string },
): Promise<PublicUser> {
  const user = await loadUser(userId);
  user.walletAddresses = { usdtBep20: (input.usdtBep20 ?? "").trim() };
  await user.save();
  await logActivity(userId, "profile.wallet-addresses", meta?.ip, meta?.userAgent);
  return toPublicUser(user);
}

/** PUT /profile/password — change password (verifies the current one). */
export async function changePassword(
  userId: string,
  input: { currentPassword: string; password: string },
  meta?: { ip?: string; userAgent?: string },
): Promise<void> {
  const user = await loadUser(userId);
  if (!user.verifyPassword(input.currentPassword)) {
    throw ApiError.badRequest("Current password is incorrect");
  }
  user.password = input.password; // virtual rehashes
  // Keep the current refresh session — the user stays logged in.
  await user.save();
  await logActivity(userId, "auth.password-change", meta?.ip, meta?.userAgent);
}

/** PUT /profile/theme — persist theme preference. */
export async function updateTheme(
  userId: string,
  theme: "light" | "dark",
  meta?: { ip?: string; userAgent?: string },
): Promise<PublicUser> {
  const user = await loadUser(userId);
  user.themePreference = theme;
  await user.save();
  await logActivity(userId, "profile.theme", meta?.ip, meta?.userAgent);
  return toPublicUser(user);
}

/** PUT /profile/notifications — update notification channel preferences. */
export async function updateNotificationPreference(
  userId: string,
  prefs: { email: boolean; dashboard: boolean },
  meta?: { ip?: string; userAgent?: string },
): Promise<PublicUser> {
  const user = await loadUser(userId);
  user.notificationPreference = { email: prefs.email, dashboard: prefs.dashboard };
  await user.save();
  await logActivity(userId, "profile.notifications", meta?.ip, meta?.userAgent);
  return toPublicUser(user);
}