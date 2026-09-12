import type { RequestHandler } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { getDashboardSummary } from "../services/dashboard.service.js";
import { getTeamEnergyInfo } from "../services/teamEnergy.service.js";
import { getCommunityMonthlyInfo } from "../services/compensation.service.js";

/** GET /dashboard/summary — authenticated user's aggregated dashboard. */
export const summary: RequestHandler[] = [
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const data = await getDashboardSummary(req.user.id);
    ok(res, data, "Dashboard summary");
  }),
];

/** GET /dashboard/team-energy — Daily Team Energy slice on its own. */
export const teamEnergy: RequestHandler[] = [
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const data = await getTeamEnergyInfo(req.user.id);
    ok(res, data, "Daily team energy");
  }),
];

/** GET /dashboard/community — Community Monthly Bonus slice on its own. */
export const community: RequestHandler[] = [
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const data = await getCommunityMonthlyInfo(req.user.id);
    ok(res, data, "Community monthly bonus");
  }),
];
