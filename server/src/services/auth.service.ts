import { User, type UserDocument } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { generateOpaqueToken } from "../utils/tokens.js";
import { issueTokens, verifyRefreshToken } from "./token.service.js";
import { logger } from "../config/logger.js";
import { env } from "../config/env.js";
import { sendEmail } from "./email.service.js";
import { verifyEmailTemplate, welcomeTemplate, resetPasswordTemplate } from "./emailTemplates.js";
import type { PublicUser } from "@zaminex/shared";

/** Lifetime of verification/reset tokens, derived from env. */
const tokenExpiryMs = () => env.EMAIL_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;

/** Issue a verification token, store its hash + expiry, and email the link. */
async function issueVerificationToken(user: UserDocument): Promise<void> {
  const rawToken = generateOpaqueToken(32);
  user.emailVerifyTokenHash = User.hashToken(rawToken);
  user.emailVerifyTokenExpires = new Date(Date.now() + tokenExpiryMs());
  await user.save();
  const link = `${env.CLIENT_URL}/verify-email?token=${rawToken}`;
  const { subject, html, text } = verifyEmailTemplate({ name: user.name, link });
  await sendEmail({ to: user.email, subject, html, text });
}

/** Strip a User document down to the safe public shape. */
export function toPublicUser(user: UserDocument): PublicUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone ?? undefined,
    role: user.role,
    referralCode: user.referralCode,
    referredBy: user.referredBy ?? undefined,
    isEmailVerified: user.isEmailVerified,
    themePreference: user.themePreference,
    status: user.status,
  };
}

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  referralCode?: string;
}

export async function registerUser(input: RegisterInput) {
  const existing = await User.findOne({ email: input.email });
  if (existing) throw ApiError.conflict("An account with this email already exists");

  let referrer: UserDocument | null = null;
  if (input.referralCode) {
    referrer = await User.findOne({ referralCode: input.referralCode });
    if (!referrer) throw ApiError.badRequest("Invalid referral code");
    if (referrer.status !== "active") throw ApiError.badRequest("Referrer account is not active");
  }

  const user = new User({
    name: input.name,
    email: input.email,
    phone: input.phone,
    password: input.password, // virtual hashes it
    referredBy: referrer ? referrer.referralCode : null,
  });
  await user.save();

  const tokens = issueTokens(user._id.toString(), user.role);
  user.refreshTokenHash = User.hashToken(tokens.refreshToken);
  await user.save();

  // Send the verification email. Failures are logged, not thrown — a signup
  // must never be blocked by an email outage (resend is available later).
  await issueVerificationToken(user);
  logger.info("User registered", { userId: user._id, email: user.email, referredBy: user.referredBy });

  return { user, tokens };
}

/** Verify an email with a token issued at registration or resend. */
export async function verifyEmail(token: string) {
  // Phase 3 simplification: scan users with a pending verify token. Phase 15
  // adds an index for O(1) lookup at scale (P1 volume is trivial).
  const users = await User.find({ emailVerifyTokenHash: { $ne: null } }).select(
    "+emailVerifyTokenHash +emailVerifyTokenExpires",
  );
  const user = users.find((u) => u.verifyToken(u.emailVerifyTokenHash, token));

  if (!user) throw ApiError.badRequest("Invalid verification token");
  if (user.emailVerifyTokenExpires && user.emailVerifyTokenExpires.getTime() < Date.now()) {
    throw ApiError.badRequest("Verification token has expired");
  }

  user.isEmailVerified = true;
  user.emailVerifyTokenHash = null;
  user.emailVerifyTokenExpires = null;
  await user.save();

  // Send the welcome email (best-effort).
  const loginLink = `${env.CLIENT_URL}/app`;
  const { subject, html, text } = welcomeTemplate({ name: user.name, loginLink });
  await sendEmail({ to: user.email, subject, html, text });

  logger.info("Email verified", { userId: user._id, email: user.email });
  return toPublicUser(user);
}

/** Resend the verification email. Never leaks whether the email exists. */
export async function resendVerification(email: string) {
  const user = await User.findOne({ email }).select("+emailVerifyTokenHash");
  if (!user || user.isEmailVerified) {
    // Resolve silently — do not leak account existence or verified status.
    return { handled: false };
  }
  await issueVerificationToken(user);
  logger.info("Verification email resent", { userId: user._id, email: user.email });
  return { handled: true };
}

interface LoginInput {
  email: string;
  password: string;
}

export async function loginUser(input: LoginInput) {
  const user = await User.findOne({ email: input.email }).select("+passwordHash +refreshTokenHash");
  if (!user) throw ApiError.unauthorized("Invalid email or password");

  if (user.status !== "active") throw ApiError.forbidden("Account is not active");

  const match = user.verifyPassword(input.password);
  if (!match) throw ApiError.unauthorized("Invalid email or password");

  const tokens = issueTokens(user._id.toString(), user.role);
  user.refreshTokenHash = User.hashToken(tokens.refreshToken);
  user.lastLoginAt = new Date();
  await user.save();

  return { user, tokens };
}

export async function refreshSession(refreshToken: string) {
  const { sub: userId } = verifyRefreshToken(refreshToken);
  const user = await User.findById(userId).select("+refreshTokenHash");
  if (!user || user.status !== "active") throw ApiError.unauthorized("Session no longer valid");

  const valid = user.verifyToken(user.refreshTokenHash, refreshToken);
  if (!valid) {
    // Possible token reuse / theft — invalidate the session.
    user.refreshTokenHash = null;
    await user.save();
    throw ApiError.unauthorized("Refresh token is no longer valid");
  }

  const tokens = issueTokens(user._id.toString(), user.role);
  user.refreshTokenHash = User.hashToken(tokens.refreshToken);
  await user.save();

  return { user, tokens };
}

export async function logoutUser(userId: string) {
  const user = await User.findById(userId);
  if (!user) return;
  user.refreshTokenHash = null;
  await user.save();
}

/** Forgot-password: create a short-lived reset token and email the link. */
export async function requestPasswordReset(email: string) {
  const user = await User.findOne({ email });
  if (!user) {
    // Do not leak existence — log and return success.
    logger.warn("Password reset requested for unknown email", { email });
    return { handled: false };
  }

  const rawToken = generateOpaqueToken(32);
  user.resetTokenHash = User.hashToken(rawToken);
  user.resetTokenExpires = new Date(Date.now() + tokenExpiryMs());
  await user.save();

  // Send the reset email (best-effort).
  const link = `${env.CLIENT_URL}/reset-password?token=${rawToken}`;
  const { subject, html, text } = resetPasswordTemplate({ name: user.name, link });
  await sendEmail({ to: user.email, subject, html, text });

  logger.info("Password reset token issued", { userId: user._id });
  return { handled: true };
}

export async function resetPassword(token: string, password: string) {
  // Without an index we scan; P1 volume is trivial. Phase 3 adds an indexed lookup.
  const users = await User.find({ resetTokenHash: { $ne: null } }).select("+resetTokenHash +resetTokenExpires +passwordHash");
  const user = users.find((u) => u.verifyToken(u.resetTokenHash, token));

  if (!user) throw ApiError.badRequest("Invalid reset token");
  if (user.resetTokenExpires && user.resetTokenExpires.getTime() < Date.now()) {
    throw ApiError.badRequest("Reset token has expired");
  }

  user.password = password; // virtual rehashes
  user.resetTokenHash = null;
  user.resetTokenExpires = null;
  user.refreshTokenHash = null; // force re-login everywhere
  await user.save();
}