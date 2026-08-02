import type { Request, RequestHandler } from "express";
import { createRankSchema, updateRankSchema, rankListQuerySchema } from "@zaminex/shared";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
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
    created(res, { rank: row }, "Rank created");
  }),
];

/** PATCH /ranks/:id — update a rank (admin). */
export const update: RequestHandler[] = [
  validate(updateRankSchema),
  asyncHandler(async (req, res) => {
    const row = await updateRank(idParam(req), req.body);
    ok(res, { rank: row }, "Rank updated");
  }),
];

/** DELETE /ranks/:id — remove a rank (admin). */
export const remove: RequestHandler[] = [
  asyncHandler(async (req, res) => {
    await deleteRank(idParam(req));
    ok(res, {}, "Rank deleted");
  }),
];