import type { Request, RequestHandler } from "express";
import { validate } from "../middlewares/validate.js";
import { referralListQuerySchema, referralTeamQuerySchema, referralChildrenQuerySchema, referralUserIdParamSchema, referralValidateQuerySchema } from "@zeminex/shared";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ok } from "../utils/ApiResponse.js";
import { getReferralStats, getDirectReferrals, getTeamReferrals, getTreeChildren, validateReferralCode } from "../services/referral.service.js";
import type { ReferralMemberStatus } from "@zeminex/shared";

/** GET /referrals/me — referral code/link + team statistics. */
export const stats: RequestHandler[] = [
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const referral = await getReferralStats(req.user.id);
    ok(res, { referral }, "Referral stats");
  }),
];

/** GET /referrals/validate?code= — public pre-submit referral-code check. */
export const validateCode: RequestHandler[] = [
  validate(referralValidateQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const q = req.query as { code?: string };
    const result = await validateReferralCode(q.code ?? "");
    ok(res, result, "Referral code check");
  }),
];

/** GET /referrals/direct — the viewer's level-1 referrals (paginated). */
export const direct: RequestHandler[] = [
  validate(referralListQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const q = req.query as { status?: ReferralMemberStatus; q?: string; page?: number; limit?: number };
    const direct = await getDirectReferrals(req.user.id, {
      status: q.status,
      q: q.q,
      page: q.page ?? 1,
      limit: q.limit ?? 20,
    });
    ok(res, { direct }, "Direct referrals");
  }),
];

/** GET /referrals/team — the viewer's full downline (all levels), filterable. */
export const team: RequestHandler[] = [
  validate(referralTeamQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const q = req.query as { level?: number; status?: "active" | "inactive"; q?: string; page?: number; limit?: number };
    const team = await getTeamReferrals(req.user.id, {
      level: q.level,
      status: q.status,
      q: q.q,
      page: q.page ?? 1,
      limit: q.limit ?? 20,
    });
    ok(res, { team }, "Team referrals");
  }),
];

/** GET /referrals/children/:userId — lazy tree expansion (userId = "me" or an id). */
export const children: RequestHandler[] = [
  validate(referralUserIdParamSchema, "params"),
  validate(referralChildrenQuerySchema, "query"),
  asyncHandler(async (req: Request, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const targetUserId = (req.params.userId ?? "").toString();
    if (!targetUserId) throw ApiError.badRequest("Missing node id");
    const q = req.query as { page?: number; limit?: number };
    const children = await getTreeChildren(req.user.id, targetUserId, {
      page: q.page ?? 1,
      limit: q.limit ?? 20,
    });
    ok(res, { children }, "Tree children");
  }),
];