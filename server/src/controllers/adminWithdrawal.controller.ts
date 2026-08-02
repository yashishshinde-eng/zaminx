import type { Request, RequestHandler } from "express";
import { adminActionSchema, withdrawalListQuerySchema, withdrawalIdParamSchema } from "@zaminex/shared";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import {
  reviewWithdrawal,
  approveWithdrawal,
  rejectWithdrawal,
  markPaidWithdrawal,
  getAdminWithdrawals,
  getAdminWithdrawal,
} from "../services/withdrawal.service.js";
import type { WithdrawalStatus } from "@zaminex/shared";

const idParam = (req: Request): string => {
  const id = (req.params as { id?: string }).id;
  if (!id) throw ApiError.badRequest("Withdrawal id is required");
  return id;
};

/** GET /withdrawals/admin — all withdrawals (admin). */
export const adminList: RequestHandler[] = [
  validate(withdrawalListQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const q = req.query as { status?: WithdrawalStatus; page?: number; limit?: number };
    const page = await getAdminWithdrawals({ status: q.status, page: q.page ?? 1, limit: q.limit ?? 20 });
    ok(res, { withdrawals: page }, "Withdrawals");
  }),
];

/** GET /withdrawals/admin/:id — any withdrawal (admin). */
export const adminDetail: RequestHandler[] = [
  validate(withdrawalIdParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const row = await getAdminWithdrawal(idParam(req));
    ok(res, { withdrawal: row }, "Withdrawal");
  }),
];

/** POST /withdrawals/admin/:id/review — pending → under_review. */
export const review: RequestHandler[] = [
  validate(withdrawalIdParamSchema, "params"),
  validate(adminActionSchema),
  asyncHandler(async (req, res) => {
    const row = await reviewWithdrawal(req.user!.id, idParam(req), req.body.remarks);
    ok(res, { withdrawal: row }, "Withdrawal under review");
  }),
];

/** POST /withdrawals/admin/:id/approve — pending|under_review → approved. */
export const approve: RequestHandler[] = [
  validate(withdrawalIdParamSchema, "params"),
  validate(adminActionSchema),
  asyncHandler(async (req, res) => {
    const row = await approveWithdrawal(req.user!.id, idParam(req), req.body.remarks);
    ok(res, { withdrawal: row }, "Withdrawal approved");
  }),
];

/** POST /withdrawals/admin/:id/reject — → rejected (funds returned). */
export const reject: RequestHandler[] = [
  validate(withdrawalIdParamSchema, "params"),
  validate(adminActionSchema),
  asyncHandler(async (req, res) => {
    const row = await rejectWithdrawal(req.user!.id, idParam(req), req.body.remarks);
    ok(res, { withdrawal: row }, "Withdrawal rejected");
  }),
];

/** POST /withdrawals/admin/:id/pay — approved → paid (onHold deducted). */
export const pay: RequestHandler[] = [
  validate(withdrawalIdParamSchema, "params"),
  validate(adminActionSchema),
  asyncHandler(async (req, res) => {
    const row = await markPaidWithdrawal(req.user!.id, idParam(req), req.body.remarks);
    ok(res, { withdrawal: row }, "Withdrawal marked paid");
  }),
];