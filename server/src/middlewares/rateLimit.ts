import rateLimit, { type Options } from "express-rate-limit";
import { ApiError } from "../utils/ApiError.js";

/**
 * Integration tests (vitest) share one app + one 127.0.0.1 source IP across
 * every test in a file, and the in-memory counters never reset between tests,
 * so a suite registering >5 users would 429 on the limiter rather than on the
 * behavior under test. No test asserts real throttling, so limiters opt out
 * entirely in the test environment.
 */
const skipInTest = (): boolean => process.env.NODE_ENV === "test";

/**
 * Shared 429 handler (Phase 19). Instead of express-rate-limit's default inline
 * `res.status(429).json(...)`, route the limit through `next(ApiError)` so the
 * central `errorHandler` owns the envelope, logs it, and attaches
 * `Retry-After` (derived from the limiter's per-window reset time). The standard
 * `RateLimit-*` headers are still set by the limiter middleware itself before
 * this handler runs.
 */
function limitHandler(
  req: Parameters<NonNullable<Options["handler"]>>[0],
  _res: Parameters<NonNullable<Options["handler"]>>[1],
  next: Parameters<NonNullable<Options["handler"]>>[2],
  options: Parameters<NonNullable<Options["handler"]>>[3],
): void {
  const reset = (req as { rateLimit?: { resetTime?: Date } }).rateLimit?.resetTime;
  const retryAfter = reset ? Math.max(1, Math.ceil((reset.getTime() - Date.now()) / 1000)) : undefined;
  const msg =
    typeof options.message === "string"
      ? options.message
      : (options.message as { message?: string } | undefined)?.message ?? "Too many requests, please try again later.";
  next(ApiError.tooManyRequests(msg, retryAfter));
}

/** General API rate limiter. */
export const apiLimiter = rateLimit({
  skip: skipInTest,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
  handler: limitHandler,
});

const authMessage = { success: false, message: "Too many attempts, please try again later." };

/**
 * Dedicated auth limiters (Phase 15). Each sensitive endpoint gets its own
 * bucket per IP so one endpoint's traffic can't consume another's quota — the
 * previous shared `authLimiter` let login + register + forgot + reset + verify
 * + resend all draw from a single 20/15min counter.
 */
export const loginLimiter = rateLimit({ skip: skipInTest, windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: authMessage, handler: limitHandler });
export const registerLimiter = rateLimit({ skip: skipInTest, windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false, message: authMessage, handler: limitHandler });
export const refreshLimiter = rateLimit({ skip: skipInTest, windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false, message: authMessage, handler: limitHandler });
export const forgotResetLimiter = rateLimit({ skip: skipInTest, windowMs: 15 * 60 * 1000, max: 3, standardHeaders: true, legacyHeaders: false, message: authMessage, handler: limitHandler });
export const verifyLimiter = rateLimit({ skip: skipInTest, windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false, message: authMessage, handler: limitHandler });

/** Withdrawal submission limiter — a high-value mutation worth throttling. */
export const withdrawalLimiter = rateLimit({
  skip: skipInTest,
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many withdrawal requests, please try again later." },
  handler: limitHandler,
});

/** Public contact-form limiter — anti-spam on an unauthenticated endpoint. */
export const contactLimiter = rateLimit({
  skip: skipInTest,
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many submissions, please try again later." },
  handler: limitHandler,
});

/**
 * Wallet-deposit initiation limiter — each request creates a NOWPayments
 * invoice (a gateway round-trip when live), so throttle creation to blunt
 * accidental spam / abuse. Confirmation itself is webhook-driven and unaffected.
 */
export const depositLimiter = rateLimit({
  skip: skipInTest,
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many deposit requests, please try again later." },
  handler: limitHandler,
});

/**
 * Public referral-code validation limiter. The register form debounces checks
 * (one per keystroke burst), but the endpoint is unauthenticated, so cap it to
 * blunt code-enumeration attempts. 30/15min is plenty for normal typing+prefill.
 */
export const referralValidateLimiter = rateLimit({
  skip: skipInTest,
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many checks, please try again later." },
  handler: limitHandler,
});