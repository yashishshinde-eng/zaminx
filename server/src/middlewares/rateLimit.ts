import rateLimit from "express-rate-limit";

/** General API rate limiter. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});

const authMessage = { success: false, message: "Too many attempts, please try again later." };

/**
 * Dedicated auth limiters (Phase 15). Each sensitive endpoint gets its own
 * bucket per IP so one endpoint's traffic can't consume another's quota — the
 * previous shared `authLimiter` let login + register + forgot + reset + verify
 * + resend all draw from a single 20/15min counter.
 */
export const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false, message: authMessage });
export const registerLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false, message: authMessage });
export const refreshLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false, message: authMessage });
export const forgotResetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 3, standardHeaders: true, legacyHeaders: false, message: authMessage });
export const verifyLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false, message: authMessage });

/** Withdrawal submission limiter — a high-value mutation worth throttling. */
export const withdrawalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many withdrawal requests, please try again later." },
});

/** Public contact-form limiter — anti-spam on an unauthenticated endpoint. */
export const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many submissions, please try again later." },
});