import type { RequestHandler } from "express";
import { compensationSettingsSchema } from "@zaminex/shared";
import type { CompensationSettingsBody } from "@zaminex/shared";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { getAdminDashboardSummary } from "../services/adminDashboard.service.js";
import {
  getCompensationSettings,
  updateCompensationSettings as updateCompensationSettingsSvc,
} from "../services/setting.service.js";

/** GET /admin/dashboard — platform-wide admin dashboard (KPIs + series + activity). */
export const dashboard: RequestHandler[] = [
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const dashboard = await getAdminDashboardSummary();
    ok(res, { dashboard }, "Admin dashboard");
  }),
];

/** GET /admin/settings/compensation — read the 7 compensation knobs. */
export const compensationSettings: RequestHandler[] = [
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const compensation = await getCompensationSettings();
    ok(res, { compensation }, "Compensation settings");
  }),
];

/** PATCH /admin/settings/compensation — update the provided compensation knobs. */
export const updateCompensationSettings: RequestHandler[] = [
  validate(compensationSettingsSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const compensation = await updateCompensationSettingsSvc(req.body as CompensationSettingsBody);
    ok(res, { compensation }, "Compensation settings updated");
  }),
];