import type { RequestHandler } from "express";
import { activatePackageSchema } from "@zeminex/shared";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { listCatalog, getMyPackages, activatePackage } from "../services/package.service.js";

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

/** POST /packages/activate — initiate a package activation (creates a pending
 *  subscription + NOWPayments invoice + deposit; Phase 7). */
export const activate: RequestHandler[] = [
  validate(activatePackageSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const { pkg, payment } = await activatePackage(req.user.id, req.body.packageId, meta(req));
    created(res, { package: pkg, payment }, "Package activation started");
  }),
];