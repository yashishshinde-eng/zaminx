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
  .max(128);

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
    referralCode: z
      .string()
      .trim()
      .max(50)
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
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