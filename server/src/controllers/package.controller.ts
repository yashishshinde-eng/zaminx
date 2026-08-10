import type { RequestHandler } from "express";
import { activatePackageSchema, activateForSchema, packageTargetLookupSchema } from "@zeminex/shared";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { listCatalog, getMyPackages, activatePackage, activatePackageFor } from "../services/package.service.js";
import { User } from "../models/index.js";

const meta = (req: Parameters<RequestHandler>[0]) => ({ ip: req.ip, userAgent: req.headers["user-agent"] });

/** GET /packages — active catalog. */
export const catalog: RequestHandler[] = [
  asyncHandler(async (_req, res) => {
    const tiers = await listCatalog();
    ok(res, { packages: tiers }, "Package catalog");
  }),
];

/** GET /packages/mine — the user's subscriptions (history). */
export const myPackages: RequestHandler[] = [
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const rows = await getMyPackages(req.user.id);
    ok(res, { packages: rows }, "Your packages");
  }),
];

/** POST /packages/activate — activate a package from the user's Main wallet
 *  balance (debit + already-active subscription + wallet-funded deposit). */
export const activate: RequestHandler[] = [
  validate(activatePackageSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const { pkg, payment } = await activatePackage(req.user.id, req.body.packageId, meta(req));
    created(res, { package: pkg, payment }, "Package activated");
  }),
];

/** POST /packages/activate-for — an active user pays from their own Main wallet
 *  to activate a package for another inactive user. `requireActive` is mounted
 *  on the route (see package.routes.ts); the body carries the target id. */
export const activateFor: RequestHandler[] = [
  validate(activateForSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const { pkg, payment } = await activatePackageFor(req.user.id, req.body.targetUserId, req.body.packageId, meta(req));
    created(res, { package: pkg, payment }, "Package activated for member");
  }),
];

/** GET /packages/lookup-target — resolve a referral code to a user so the actor
 *  can confirm the beneficiary before activating. Returns identity + status;
 *  eligibility is re-checked at activation time. */
export const lookupTarget: RequestHandler[] = [
  validate(packageTargetLookupSchema, "query"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const { code } = req.query as { code: string };
    const target = await User.findOne({ referralCode: code.trim() }).select("name status").lean();
    if (!target) throw ApiError.notFound("User not found for that referral code");
    ok(res, { id: target._id, name: target.name, status: target.status, isSelf: target._id.toString() === req.user.id }, "Target user");
  }),
];