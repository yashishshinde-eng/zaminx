import { User, ActivityLog, type UserDocument } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { generateOpaqueToken } from "../utils/tokens.js";
import { issueTokens, verifyRefreshToken } from "./token.service.js";
import { logger } from "../config/logger.js";
import { env } from "../config/env.js";
import { sendEmail } from "./email.service.js";
import { verifyEmailTemplate, welcomeTemplate, resetPasswordTemplate } from "./emailTemplates.js";
import { evaluateBonanzasForUser } from "./compensation.service.js";
import { evaluateRankForUser } from "./rank.service.js";
import type { PublicUser } from "@zeminex/shared";

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
    notificationPreference: user.notificationPreference ?? { email: true, dashboard: true },
    walletAddresses: {
      usdtBep20: user.walletAddresses?.usdtBep20 || undefined,
    },
    status: user.status,
  };
}

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  countryCode: string;
  transactionPassword: string;
  referralCode: string;
}

export async function registerUser(input: RegisterInput) {
  const existing = await User.findOne({ email: input.email });
  if (existing) throw ApiError.conflict("An account with this email already exists");

  // A valid referral code is compulsory — every member joins under an existing
  // active sponsor (the seeded admin is the root). No self-registration without
  // a referrer.
  const referrer = await User.findOne({ referralCode: input.referralCode });
  if (!referrer) throw ApiError.badRequest("Invalid referral code");
  if (referrer.status !== "active") throw ApiError.badRequest("Referrer account is not active");

  const user = new User({
    name: input.name,
    email: input.email,
    phone: input.phone,
    countryCode: input.countryCode,
    password: input.password, // virtual hashes it
    transactionPassword: input.transactionPassword, // virtual hashes the 4-digit PIN
    referredBy: referrer.referralCode,
    // Phase 9: materialise the referral graph so descendants are one index hit.
    // lineage = the referrer's ancestor chain + the referrer itself (root → sponsor).
    sponsorId: referrer._id,
    lineage: [...referrer.lineage, referrer._id],
  });
  await user.save();

  const tokens = issueTokens(user._id.toString(), user.role);
  user.refreshTokenHash = User.hashToken(tokens.refreshToken);
  await user.save();

  // Send the verification email. Failures are logged, not thrown — a signup
  // must never be blocked by an email outage (resend is available later).
  await issueVerificationToken(user);
  logger.info("User registered", { userId: user._id, email: user.email, referredBy: user.referredBy });

  // Phase 10/10A: a new referral raised the sponsor's direct + team counts,
  // which may qualify them for a bonanza reward or a new rank. Best-effort —
  // never blocks signup.
  if (user.sponsorId) {
    const sponsorId = user.sponsorId.toString();
    Promise.all([evaluateBonanzasForUser(sponsorId), evaluateRankForUser(sponsorId)]).catch(
      () => undefined,
    );
  }

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

  const match = user.verifyPassword(input.password);
  if (!match) throw ApiError.unauthorized("Invalid email or password");

  // Check status AFTER the password check so an attacker can't enumerate which
  // emails exist / are active without already knowing the password. Inactive
  // users may log in to deposit funds and activate a package; only blocked
  // accounts are denied.
  if (user.status === "blocked") throw ApiError.forbidden("Account is blocked");

  const tokens = issueTokens(user._id.toString(), user.role);
  user.refreshTokenHash = User.hashToken(tokens.refreshToken);
  user.lastLoginAt = new Date();
  await user.save();

  return { user, tokens };
}

export async function refreshSession(refreshToken: string) {
  const { sub: userId } = verifyRefreshToken(refreshToken);
  const user = await User.findById(userId).select("+refreshTokenHash");
  if (!user || user.status === "blocked") throw ApiError.unauthorized("Session no longer valid");

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

/**
 * Logout by refresh token (Phase 15). Verify the token to find the user, then
 * null their refresh hash. Never throws — logout must always succeed for the
 * client (it clears its own tokens regardless). Fixes the prior no-op logout
 * where `/auth/logout` had no `authenticate` so `refreshTokenHash` was never
 * cleared and a captured refresh token stayed valid for its full TTL.
 */
export async function logoutByRefreshToken(refreshToken?: string) {
  if (!refreshToken) return;
  try {
    const { sub } = verifyRefreshToken(refreshToken);
    await logoutUser(sub);
  } catch {
    // Invalid / expired / unknown token — nothing to invalidate server-side.
  }
}

/**
 * Force-logout everyone except the acting admin (Phase 14C). Bulk-nulls
 * `refreshTokenHash` across all users. Access tokens stay valid until their
 * short JWT expiry (per the user's "clear refresh only" decision); refresh is
 * what's blocked, so affected sessions can't renew.
 */
export async function forceLogoutAll(adminId: string): Promise<{ count: number }> {
  const result = await User.updateMany(
    { _id: { $ne: adminId } },
    { $set: { refreshTokenHash: null } },
  );
  await ActivityLog.create({
    actor: adminId,
    action: "user.force_logout_all",
    resource: "User",
    meta: { count: result.modifiedCount },
  }).catch(() => undefined);
  return { count: result.modifiedCount };
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