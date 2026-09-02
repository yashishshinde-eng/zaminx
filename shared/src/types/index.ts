import { z } from "zod";
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  changeTransactionPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from "../schemas/auth.schema.js";
import {
  updateProfileSchema,
  updateWalletAddressesSchema,
  updateThemeSchema,
  updateNotificationPreferenceSchema,
} from "../schemas/profile.schema.js";
import { activatePackageSchema } from "../schemas/package.schema.js";
import type { WalletBalances } from "./wallet";

/** Role attached to an authenticated request. */
export type UserRole = "user" | "admin";

/** Account status lifecycle (active / inactive / blocked). */
export type UserStatus = "active" | "inactive" | "blocked";

/** Per-user crypto payout/deposit addresses. USDT-BEP20 is the only supported currency. */
export interface WalletAddresses {
  usdtBep20?: string;
}

/** User document shape as exposed over the API (no secrets). */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  referralCode: string;
  referredBy?: string;
  isEmailVerified: boolean;
  themePreference: "light" | "dark";
  notificationPreference: { email: boolean; dashboard: boolean };
  walletAddresses: WalletAddresses;
  status: "active" | "inactive" | "blocked";
}

/** Auth response payload (login / register / refresh). */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

/** A recent audit-log entry for a single user (admin detail view). */
export interface AdminUserActivityRow {
  id: string;
  action: string;
  resource: string | null;
  resourceId: string | null;
  createdAt: string;
}

/**
 * Full admin view of a single user — profile fields plus wallet balances, the
 * user's active package, direct-referral count, and recent activity. Admin is
 * authorised to see this PII (the no-PII rule applies only to user-facing
 * downline views). Returned by `GET /admin/users/:id`.
 */
export interface AdminUserDetail {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  referralCode: string;
  referredBy: string | null;
  sponsorId: string | null;
  isEmailVerified: boolean;
  walletAddresses: WalletAddresses;
  notificationPreference: { email: boolean; dashboard: boolean };
  directCount: number;
  walletBalances: WalletBalances;
  activePackage: {
    name: string;
    activatedAt: string;
    expiresAt: string;
  } | null;
  joinedAt: string;
  lastLoginAt: string | null;
  recentActivity: AdminUserActivityRow[];
}

/** Inferred request-body types from the Zod schemas. */
export type RegisterBody = z.infer<typeof registerSchema>["body"];
export type LoginBody = z.infer<typeof loginSchema>["body"];
export type RefreshBody = z.infer<typeof refreshSchema>["body"];
export type ForgotPasswordBody = z.infer<typeof forgotPasswordSchema>["body"];
export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>["body"];
export type ChangePasswordBody = z.infer<typeof changePasswordSchema>["body"];
export type ChangeTransactionPasswordBody = z.infer<typeof changeTransactionPasswordSchema>["body"];
export type VerifyEmailBody = z.infer<typeof verifyEmailSchema>["body"];
export type ResendVerificationBody = z.infer<typeof resendVerificationSchema>["body"];
export type UpdateProfileBody = z.infer<typeof updateProfileSchema>["body"];
export type UpdateWalletAddressesBody = z.infer<typeof updateWalletAddressesSchema>["body"];
export type UpdateThemeBody = z.infer<typeof updateThemeSchema>["body"];
export type UpdateNotificationPreferenceBody = z.infer<typeof updateNotificationPreferenceSchema>["body"];
export type ActivatePackageBody = z.infer<typeof activatePackageSchema>["body"];
export * from "./cms.js";
export * from "./dashboard.js";
export * from "./package.js";
export * from "./deposit.js";
export * from "./wallet.js";
export * from "./withdrawal.js";
export * from "./referral.js";
export * from "./compensation.js";
export * from "./report.js";
export * from "./adminLogs.js";
export * from "./p2p.js";
export * from "./support.js";
