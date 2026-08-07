import type { RequestHandler } from "express";
import {
  updateProfileSchema,
  updateWalletAddressesSchema,
  updateThemeSchema,
  updateNotificationPreferenceSchema,
  changePasswordSchema,
} from "@zeminex/shared";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import {
  updateProfile,
  updateWalletAddresses,
  changePassword,
  updateTheme,
  updateNotificationPreference,
} from "../services/profile.service.js";

const meta = (req: Parameters<RequestHandler>[0]) => ({ ip: req.ip, userAgent: req.headers["user-agent"] });

/** PUT /profile */
export const updateProfileHandler: RequestHandler[] = [
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const user = await updateProfile(req.user.id, req.body, meta(req));
    ok(res, { user }, "Profile updated");
  }),
];

/** PUT /profile/wallet-addresses */
export const updateWalletAddressesHandler: RequestHandler[] = [
  validate(updateWalletAddressesSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const user = await updateWalletAddresses(req.user.id, req.body, meta(req));
    ok(res, { user }, "Wallet address updated");
  }),
];

/** PUT /profile/password */
export const changePasswordHandler: RequestHandler[] = [
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    await changePassword(req.user.id, req.body, meta(req));
    ok(res, null, "Password updated");
  }),
];

/** PUT /profile/theme */
export const updateThemeHandler: RequestHandler[] = [
  validate(updateThemeSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const user = await updateTheme(req.user.id, req.body.theme, meta(req));
    ok(res, { user }, "Theme preference updated");
  }),
];

/** PUT /profile/notifications */
export const updateNotificationsHandler: RequestHandler[] = [
  validate(updateNotificationPreferenceSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const user = await updateNotificationPreference(req.user.id, req.body, meta(req));
    ok(res, { user }, "Notification preferences updated");
  }),
];