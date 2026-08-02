import { z } from "zod";
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from "../schemas/auth.schema";
import {
  updateProfileSchema,
  updateWalletAddressesSchema,
  updateThemeSchema,
  updateNotificationPreferenceSchema,
} from "../schemas/profile.schema";
import { activatePackageSchema } from "../schemas/package.schema";

/** Role attached to an authenticated request. */
export type UserRole = "user" | "admin";

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
  status: "active" | "suspended" | "banned";
}

/** Auth response payload (login / register / refresh). */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

/** Inferred request-body types from the Zod schemas. */
export type RegisterBody = z.infer<typeof registerSchema>["body"];
export type LoginBody = z.infer<typeof loginSchema>["body"];
export type RefreshBody = z.infer<typeof refreshSchema>["body"];
export type ForgotPasswordBody = z.infer<typeof forgotPasswordSchema>["body"];
export type ResetPasswordBody = z.infer<typeof resetPasswordSchema>["body"];
export type ChangePasswordBody = z.infer<typeof changePasswordSchema>["body"];
export type VerifyEmailBody = z.infer<typeof verifyEmailSchema>["body"];
export type ResendVerificationBody = z.infer<typeof resendVerificationSchema>["body"];
export type UpdateProfileBody = z.infer<typeof updateProfileSchema>["body"];
export type UpdateWalletAddressesBody = z.infer<typeof updateWalletAddressesSchema>["body"];
export type UpdateThemeBody = z.infer<typeof updateThemeSchema>["body"];
export type UpdateNotificationPreferenceBody = z.infer<typeof updateNotificationPreferenceSchema>["body"];
export type ActivatePackageBody = z.infer<typeof activatePackageSchema>["body"];
export * from "./cms";
export * from "./dashboard";
export * from "./package";
export * from "./deposit";
export * from "./wallet";
export * from "./withdrawal";
export * from "./referral";
export * from "./compensation";
