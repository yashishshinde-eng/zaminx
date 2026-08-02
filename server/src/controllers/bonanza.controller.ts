import type { Request, RequestHandler } from "express";
import { createBonanzaSchema, updateBonanzaSchema, bonanzaListQuerySchema } from "@zaminex/shared";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import {
  getBonanzaOverview,
  createBonanza,
  listBonanzas,
  getBonanza,
  updateBonanza,
  deleteBonanza,
} from "../services/bonanza.service.js";
import type { BonanzaStatus } from "@zaminex/shared";

const idParam = (req: Request): string => {
  const id = (req.params as { id?: string }).id;
  if (!id) throw ApiError.badRequest("Offer id is required");
  return id;
};

/** GET /bonanzas — the viewer's active offers + progress (user). */
export const overview: RequestHandler[] = [
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const data = await getBonanzaOverview(req.user.id);
    ok(res, { bonanzas: data }, "Bonanza overview");
  }),
];

/** GET /bonanzas/admin — paginated, filterable offer list (admin). */
export const adminList: RequestHandler[] = [
  validate(bonanzaListQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const q = req.query as { status?: BonanzaStatus; page?: number; limit?: number };
    const page = await listBonanzas({ status: q.status, page: q.page ?? 1, limit: q.limit ?? 20 });
    ok(res, { bonanzas: page }, "Bonanza offers");
  }),
];

/** GET /bonanzas/admin/:id — single offer (admin). */
export const adminDetail: RequestHandler[] = [
  asyncHandler(async (req, res) => {
    const row = await getBonanza(idParam(req));
    ok(res, { bonanza: row }, "Bonanza offer");
  }),
];

/** POST /bonanzas/admin — create an offer (admin). */
export const create: RequestHandler[] = [
  validate(createBonanzaSchema),
  asyncHandler(async (req, res) => {
    const row = await createBonanza(req.body);
    created(res, { bonanza: row }, "Bonanza offer created");
  }),
];

/** PATCH /bonanzas/admin/:id — update an offer (admin). */
export const update: RequestHandler[] = [
  validate(updateBonanzaSchema),
  asyncHandler(async (req, res) => {
    const row = await updateBonanza(idParam(req), req.body);
    ok(res, { bonanza: row }, "Bonanza offer updated");
  }),
];

/** DELETE /bonanzas/admin/:id — remove an offer (admin). */
export const remove: RequestHandler[] = [
  asyncHandler(async (req, res) => {
    await deleteBonanza(idParam(req));
    ok(res, {}, "Bonanza offer deleted");
  }),
];