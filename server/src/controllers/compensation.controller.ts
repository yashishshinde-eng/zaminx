import type { RequestHandler } from "express";
import {
  runYieldSchema,
  evaluateBonanzaSchema,
  runTeamEnergySchema,
  runCommunitySchema,
  runRankCheckSchema,
} from "@zaminex/shared";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import {
  runDailyYield,
  evaluateBonanzasForUser,
  runBonanzaEvaluationAll,
  runDailyTeamEnergy,
  runMonthlyCommunityBonus,
} from "../services/compensation.service.js";
import { evaluateRankForUser, runRankCheckAll } from "../services/rank.service.js";
import { BonanzaOffer, UserPackage, User, Rank } from "../models/index.js";

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
    const [activePackages, totalUsers, sponsors, activeOffers, activeRanks] = await Promise.all([
      UserPackage.countDocuments({ status: "active" }),
      User.countDocuments({}),
      User.countDocuments({ sponsorId: { $ne: null } }),
      BonanzaOffer.countDocuments({ status: "active" }),
      Rank.countDocuments({ status: "active" }),
    ]);
    ok(
      res,
      { overview: { activePackages, totalUsers, sponsors, activeOffers, activeRanks } },
      "Compensation overview",
    );
  }),
];

/** POST /compensation/run-team-energy — trigger a daily team-energy run (admin). */
export const runTeamEnergy: RequestHandler[] = [
  validate(runTeamEnergySchema, "query"),
  asyncHandler(async (req, res) => {
    const date = (req.query as { date?: string }).date;
    const asOf = date ? new Date(date + "T00:00:00.000Z") : undefined;
    if (asOf && Number.isNaN(asOf.getTime())) throw ApiError.badRequest("Invalid date");
    const summary = await runDailyTeamEnergy(asOf);
    ok(res, { teamEnergy: summary }, "Team energy run complete");
  }),
];

/** POST /compensation/run-community — trigger a monthly community-bonus run (admin). */
export const runCommunity: RequestHandler[] = [
  validate(runCommunitySchema, "query"),
  asyncHandler(async (req, res) => {
    const month = (req.query as { month?: string }).month;
    const asOf = month ? new Date(`${month}-01T00:00:00.000Z`) : undefined;
    if (asOf && Number.isNaN(asOf.getTime())) throw ApiError.badRequest("Invalid month");
    const summary = await runMonthlyCommunityBonus(asOf);
    ok(res, { community: summary }, "Community bonus run complete");
  }),
];

/** POST /compensation/run-rank-check — trigger a rank evaluation (admin). */
export const runRankCheck: RequestHandler[] = [
  validate(runRankCheckSchema, "query"),
  asyncHandler(async (req, res) => {
    const userId = (req.query as { userId?: string }).userId;
    if (userId) {
      const result = await evaluateRankForUser(userId);
      ok(res, { rank: { evaluated: 1, ...result } }, "Rank check complete");
    } else {
      const summary = await runRankCheckAll();
      ok(res, { rank: summary }, "Rank check complete");
    }
  }),
];