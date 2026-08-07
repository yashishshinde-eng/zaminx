import type { RequestHandler } from "express";
import { createWithdrawalSchema, withdrawalListQuerySchema, withdrawalIdParamSchema } from "@zeminex/shared";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import {
  submitWithdrawal,
  getWithdrawals,
  getWithdrawalForUser,
  cancelWithdrawal,
} from "../services/withdrawal.service.js";
import type { WithdrawalStatus } from "@zeminex/shared";

const meta = (req: Parameters<RequestHandler>[0]) => ({ ip: req.ip, userAgent: req.headers["user-agent"] });

/** POST /withdrawals — submit a withdrawal request (available → onHold). */
export const create: RequestHandler[] = [
  validate(createWithdrawalSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const row = await submitWithdrawal(req.user.id, req.body, meta(req));
    created(res, { withdrawal: row }, "Withdrawal submitted");
  }),
];

/** GET /withdrawals — the user's withdrawals (paginated, filterable). */
export const list: RequestHandler[] = [
  validate(withdrawalListQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const q = req.query as { status?: WithdrawalStatus; page?: number; limit?: number };
    const page = await getWithdrawals(req.user.id, { status: q.status, page: q.page ?? 1, limit: q.limit ?? 20 });
    ok(res, { withdrawals: page }, "Your withdrawals");
  }),
];

/** GET /withdrawals/:id — single withdrawal (ownership-checked). */
export const detail: RequestHandler[] = [
  validate(withdrawalIdParamSchema, "params"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const id = (req.params as { id?: string }).id;
    if (!id) throw ApiError.badRequest("Withdrawal id is required");
    const row = await getWithdrawalForUser(req.user.id, id);
    ok(res, { withdrawal: row }, "Withdrawal");
  }),
];

/** POST /withdrawals/:id/cancel — user cancel (pending/under_review). */
export const cancel: RequestHandler[] = [
  validate(withdrawalIdParamSchema, "params"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const id = (req.params as { id?: string }).id;
    if (!id) throw ApiError.badRequest("Withdrawal id is required");
    const row = await cancelWithdrawal(req.user.id, id, meta(req));
    ok(res, { withdrawal: row }, "Withdrawal cancelled");
  }),
];