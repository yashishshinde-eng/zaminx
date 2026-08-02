import type { RequestHandler } from "express";
import { runYieldSchema, evaluateBonanzaSchema } from "@zaminex/shared";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { runDailyYield, evaluateBonanzasForUser, runBonanzaEvaluationAll } from "../services/compensation.service.js";
import { BonanzaOffer, UserPackage, User } from "../models/index.js";

/** POST /compensation/run-yield — trigger a daily trade-yield run (admin). */
export const runYield: RequestHandler[] = [
  validate(runYieldSchema, "query"),
  asyncHandler(async (req, res) => {
    const date = (req.query as { date?: string }).date;
    const asOf = date ? new Date(date + "T00:00:00.000Z") : undefined;
    if (asOf && Number.isNaN(asOf.getTime())) throw ApiError.badRequest("Invalid date");
    const summary = await runDailyYield(asOf);
    ok(res, { yield: summary }, "Yield run complete");
  }),
];

/** POST /compensation/evaluate-bonanzas — trigger a bonanza evaluation (admin). */
export const evaluateBonanzas: RequestHandler[] = [
  validate(evaluateBonanzaSchema, "query"),
  asyncHandler(async (req, res) => {
    const userId = (req.query as { userId?: string }).userId;
    if (userId) {
      const result = await evaluateBonanzasForUser(userId);
      ok(res, { bonanza: { evaluated: 1, ...result } }, "Bonanza evaluation complete");
    } else {
      const summary = await runBonanzaEvaluationAll();
      ok(res, { bonanza: summary }, "Bonanza evaluation complete");
    }
  }),
];

/** GET /compensation/overview — admin compensation dashboard counts. */
export const overview: RequestHandler[] = [
  asyncHandler(async (_req, res) => {
    const [activePackages, totalUsers, sponsors, activeOffers] = await Promise.all([
      UserPackage.countDocuments({ status: "active" }),
      User.countDocuments({}),
      User.countDocuments({ sponsorId: { $ne: null } }),
      BonanzaOffer.countDocuments({ status: "active" }),
    ]);
    ok(res, { overview: { activePackages, totalUsers, sponsors, activeOffers } }, "Compensation overview");
  }),
];