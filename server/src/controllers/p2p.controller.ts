import type { RequestHandler } from "express";
import { createP2PTransferSchema, p2pTransferListQuerySchema } from "@zeminex/shared";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, created } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { sendP2PTransfer, getP2PTransfers } from "../services/p2p.service.js";
import type { WalletType } from "@zeminex/shared";

const meta = (req: Parameters<RequestHandler>[0]) => ({ ip: req.ip, userAgent: req.headers["user-agent"] });

/** POST /p2p — send a P2P wallet transfer. */
export const create: RequestHandler[] = [
  validate(createP2PTransferSchema),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const row = await sendP2PTransfer(req.user.id, req.body, meta(req));
    created(res, { transfer: row }, "Transfer sent");
  }),
];

/** GET /p2p — the user's P2P transfer history (paginated, filterable). */
export const list: RequestHandler[] = [
  validate(p2pTransferListQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const q = req.query as { wallet?: WalletType; page?: number; limit?: number };
    const page = await getP2PTransfers(req.user.id, {
      wallet: q.wallet,
      page: q.page ?? 1,
      limit: q.limit ?? 20,
    });
    ok(res, { transfers: page }, "Transfer history");
  }),
];