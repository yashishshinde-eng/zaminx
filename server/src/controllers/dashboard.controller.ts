import type { RequestHandler } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { getDashboardSummary } from "../services/dashboard.service.js";

/** GET /dashboard/summary — authenticated user's aggregated dashboard. */
export const summary: RequestHandler[] = [
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const data = await getDashboardSummary(req.user.id);
    ok(res, data, "Dashboard summary");
  }),
];