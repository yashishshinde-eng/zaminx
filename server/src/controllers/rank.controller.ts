import type { Request, RequestHandler } from "express";
import { createRankSchema, updateRankSchema, rankListQuerySchema, rankIdParamSchema } from "@zaminex/shared";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { ActivityLog } from "../models/index.js";
import {
  createRank,
  listRanks,
  getRank,
  updateRank,
  deleteRank,
} from "../services/rank.service.js";
import type { RankStatus } from "@zaminex/shared";

const idParam = (req: Request): string => {
  const id = (req.params as { id?: string }).id;
  if (!id) throw ApiError.badRequest("Rank id is required");
  return id;
};

/** GET /ranks — paginated, filterable rank list (admin). */
export const list: RequestHandler[] = [
  validate(rankListQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const q = req.query as { status?: RankStatus; page?: number; limit?: number };
    const page = await listRanks({ status: q.status, page: q.page ?? 1, limit: q.limit ?? 20 });
    ok(res, { ranks: page }, "Ranks");
  }),
];

/** GET /ranks/:id — single rank (admin). */
export const detail: RequestHandler[] = [
  validate(rankIdParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const row = await getRank(idParam(req));
    ok(res, { rank: row }, "Rank");
  }),
];

/** POST /ranks — create a rank (admin). */
export const create: RequestHandler[] = [
  validate(createRankSchema),
  asyncHandler(async (req, res) => {
    const row = await createRank(req.body);
    await ActivityLog.create({ actor: req.user!.id, action: "rank.create", resource: "Rank", meta: { name: (req.body as { name?: string }).name } }).catch(() => undefined);
    created(res, { rank: row }, "Rank created");
  }),
];

/** PATCH /ranks/:id — update a rank (admin). */
export const update: RequestHandler[] = [
  validate(rankIdParamSchema, "params"),
  validate(updateRankSchema),
  asyncHandler(async (req, res) => {
    const id = idParam(req);
    const row = await updateRank(id, req.body);
    await ActivityLog.create({ actor: req.user!.id, action: "rank.update", resource: "Rank", resourceId: id, meta: { name: (req.body as { name?: string }).name } }).catch(() => undefined);
    ok(res, { rank: row }, "Rank updated");
  }),
];

/** DELETE /ranks/:id — remove a rank (admin). */
export const remove: RequestHandler[] = [
  validate(rankIdParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const id = idParam(req);
    await deleteRank(id);
    await ActivityLog.create({ actor: req.user!.id, action: "rank.delete", resource: "Rank", resourceId: id }).catch(() => undefined);
    ok(res, {}, "Rank deleted");
  }),
];