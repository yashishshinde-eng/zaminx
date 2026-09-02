import { z } from "zod";

/** Common field rules reused across auth schemas. */
const email = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: "Invalid email address" })
  .max(254);

const password = z
  .string()
  .min(8, { message: "Password must be at least 8 characters" })
  .max(128)
  .regex(/[a-zA-Z]/, { message: "Password must contain a letter" })
  .regex(/[0-9]/, { message: "Password must contain a digit" });

/** POST /auth/register */
export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, { message: "Name is required" }).max(80),
    email,
    password,
    phone: z
      .string()
      .trim()
      .max(20)
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
    // Dialling prefix chosen from the country-code dropdown (e.g. "+1", "+91").
    // Stored alongside `phone` so the full number is countryCode + phone.
    countryCode: z
      .string()
      .trim()
      .min(1, { message: "Country code is required" })
      .max(6, { message: "Country code is too long" })
      .regex(/^\+\d{1,4}$/, { message: "Country code must start with + and 1–4 digits" }),
    // 4-digit transaction PIN — required at registration. Hashed server-side
    // and used to authorise withdrawals / transfers.
    transactionPassword: z
      .string()
      .trim()
      .length(4, { message: "Transaction PIN must be exactly 4 digits" })
      .regex(/^\d{4}$/, { message: "Transaction PIN must be exactly 4 digits" }),
    referralCode: z
      .string()
      .trim()
      .min(1, { message: "Referral code is required" })
      .max(50, { message: "Referral code is too long" }),
  }),
});

/** POST /auth/login */
export const loginSchema = z.object({
  body: z.object({
    email,
    password: z.string().min(1, { message: "Password is required" }).max(128),
  }),
});

/** POST /auth/refresh */
export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, { message: "Refresh token is required" }),
  }),
});

/** POST /auth/forgot-password */
export const forgotPasswordSchema = z.object({
  body: z.object({ email }),
});

/** POST /auth/verify-email */
export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().min(1, { message: "Token is required" }),
  }),
});

/** POST /auth/resend-verification */
export const resendVerificationSchema = z.object({
  body: z.object({ email }),
});

/** POST /auth/reset-password */
export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, { message: "Token is required" }),
    password,
  }),
});

/** Optional: change password while authenticated (used by profile phase, seeded here). */
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1).max(128),
    password,
  }),
});

/**
 * PUT /profile/transaction-password — change the 4-digit transaction PIN.
 * `currentTransactionPassword` is required only when a PIN is already set; the
 * server enforces that. A user with no PIN (legacy / pre-feature) may set one
 * by omitting the current field.
 */
export const changeTransactionPasswordSchema = z.object({
  body: z.object({
    currentTransactionPassword: z.string().trim().max(4).optional(),
    transactionPassword: z
      .string()
      .trim()
      .length(4, { message: "Transaction PIN must be exactly 4 digits" })
      .regex(/^\d{4}$/, { message: "Transaction PIN must be exactly 4 digits" }),
  }),
});

/** POST /auth/logout — optional refresh token so the server can invalidate it.
 * Always 200; a missing/invalid token just clears client-side (no-op server-side). */
export const logoutSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1).optional(),
  }),
});