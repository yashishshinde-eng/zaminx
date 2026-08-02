import type { RequestHandler } from "express";
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@zaminex/shared";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { ActivityLog } from "../models/index.js";
import {
  registerUser,
  loginUser,
  refreshSession,
  logoutUser,
  requestPasswordReset,
  resetPassword,
  toPublicUser,
} from "../services/auth.service.js";

/** POST /auth/register */
export const register: RequestHandler[] = [
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { user, tokens } = await registerUser(req.body);
    await ActivityLog.create({ actor: user._id, action: "auth.register", ip: req.ip, userAgent: req.headers["user-agent"] });
    created(res, { user: toPublicUser(user), tokens }, "Account created");
  }),
];

/** POST /auth/login */
export const login: RequestHandler[] = [
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { user, tokens } = await loginUser(req.body);
    await ActivityLog.create({ actor: user._id, action: "auth.login", ip: req.ip, userAgent: req.headers["user-agent"] });
    ok(res, { user: toPublicUser(user), tokens }, "Logged in");
  }),
];

/** POST /auth/refresh */
export const refresh: RequestHandler[] = [
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    const { user, tokens } = await refreshSession(req.body.refreshToken);
    ok(res, { user: toPublicUser(user), tokens }, "Session refreshed");
  }),
];

/** POST /auth/logout */
export const logout: RequestHandler[] = [
  asyncHandler(async (req, res) => {
    if (req.user) await logoutUser(req.user.id);
    ok(res, null, "Logged out");
  }),
];

/** GET /auth/me — requires `authenticate` (applied in the router). */
export const me: RequestHandler[] = [
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    ok(res, { user: toPublicUser(req.user) }, "Current user");
  }),
];

/** POST /auth/forgot-password */
export const forgotPassword: RequestHandler[] = [
  validate(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    await requestPasswordReset(req.body.email);
    // Always respond 200 to avoid leaking account existence.
    ok(res, null, "If that email exists, a reset link has been sent");
  }),
];

/** POST /auth/reset-password */
export const reset: RequestHandler[] = [
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    await resetPassword(req.body.token, req.body.password);
    ok(res, null, "Password updated — please log in");
  }),
];