import type { Request, RequestHandler } from "express";
import { validate } from "../middlewares/validate.js";
import { referralListQuerySchema, referralChildrenQuerySchema, referralUserIdParamSchema } from "@zeminex/shared";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ok } from "../utils/ApiResponse.js";
import { getReferralStats, getDirectReferrals, getTreeChildren } from "../services/referral.service.js";
import type { ReferralMemberStatus } from "@zeminex/shared";

/** GET /referrals/me — referral code/link + team statistics. */
export const stats: RequestHandler[] = [
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const referral = await getReferralStats(req.user.id);
    ok(res, { referral }, "Referral stats");
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