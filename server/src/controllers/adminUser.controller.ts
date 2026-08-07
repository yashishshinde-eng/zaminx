import type { RequestHandler } from "express";
import {
  adminUserListQuerySchema,
  adminUserIdParamSchema,
  adminUserStatusSchema,
  adminResetPasswordSchema,
  adminWalletAdjustSchema,
  adminDepositCreateSchema,
} from "@zeminex/shared";
import type { AdminUserListQuery, UserStatus, AdminResetPasswordBody, AdminWalletAdjustBody, AdminDepositCreateBody } from "@zeminex/shared";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import {
  listAdminUsers,
  getAdminUserDetail,
  setUserStatus,
  verifyUserEmail,
  forceLogoutUser,
  adminResetPassword,
} from "../services/adminUser.service.js";
import { adminAdjustWallet } from "../services/adminWallet.service.js";
import { adminRecordDeposit } from "../services/deposit.service.js";

/** GET /admin/users — paginated, searchable, filterable admin user list. */
export const list: RequestHandler[] = [
  validate(adminUserListQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const q = req.query as unknown as AdminUserListQuery;
    const page = await listAdminUsers({
      q: q.q,
      status: q.status,
      role: q.role,
      page: q.page,
      limit: q.limit,
    });
    ok(res, { users: page }, "Admin users");
  }),
];

/** GET /admin/users/:id — full admin view of a single user. */
export const detail: RequestHandler[] = [
  validate(adminUserIdParamSchema, "params"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const id = (req.params as { id: string }).id;
    const user = await getAdminUserDetail(id);
    ok(res, { user }, "Admin user detail");
  }),
];

/** PATCH /admin/users/:id/status — suspend / ban / activate. */
export const updateStatus: RequestHandler[] = [
  validate(adminUserIdParamSchema, "params"),
  validate(adminUserStatusSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const id = (req.params as { id: string }).id;
    await setUserStatus(req.user.id, id, (req.body as { status: UserStatus }).status);
    ok(res, {}, "User status updated");
  }),
];

/** POST /admin/users/:id/verify-email — manually mark email verified. */
export const verifyEmail: RequestHandler[] = [
  validate(adminUserIdParamSchema, "params"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const id = (req.params as { id: string }).id;
    await verifyUserEmail(req.user.id, id);
    ok(res, {}, "Email verified");
  }),
];

/** POST /admin/users/:id/force-logout — invalidate the user's refresh token. */
export const forceLogout: RequestHandler[] = [
  validate(adminUserIdParamSchema, "params"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const id = (req.params as { id: string }).id;
    await forceLogoutUser(req.user.id, id);
    ok(res, {}, "User logged out");
  }),
];

/** POST /admin/users/:id/reset-password — admin sets a new password. */
export const resetPassword: RequestHandler[] = [
  validate(adminUserIdParamSchema, "params"),
  validate(adminResetPasswordSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const id = (req.params as { id: string }).id;
    await adminResetPassword(req.user.id, id, (req.body as AdminResetPasswordBody).password);
    ok(res, {}, "Password reset");
  }),
];

/** POST /admin/users/:id/wallet/adjust — admin credit/debit a wallet field (Phase 14C). */
export const adjustWallet: RequestHandler[] = [
  validate(adminUserIdParamSchema, "params"),
  validate(adminWalletAdjustSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const id = (req.params as { id: string }).id;
    const result = await adminAdjustWallet(req.user.id, id, req.body as AdminWalletAdjustBody);
    ok(res, { balance: result.balance, wallet: result.wallet }, "Wallet adjusted");
  }),
];

/** POST /admin/users/:id/deposits — admin records a paid deposit + credits Main wallet. */
export const createDeposit: RequestHandler[] = [
  validate(adminUserIdParamSchema, "params"),
  validate(adminDepositCreateSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const id = (req.params as { id: string }).id;
    const result = await adminRecordDeposit(req.user.id, id, req.body as AdminDepositCreateBody);
    ok(res, { deposit: result.deposit, balance: result.balance }, "Deposit recorded");
  }),
];