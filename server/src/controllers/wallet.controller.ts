import type { RequestHandler } from "express";
import { validate } from "../middlewares/validate.js";
import { walletLedgerQuerySchema } from "@zaminex/shared";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { getWalletBalances, getWalletLedger } from "../services/wallet.service.js";
import type { WalletType } from "@zaminex/shared";

/** GET /wallet — the user's three wallet balances + rolled-up totals. */
export const balances: RequestHandler[] = [
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const wallets = await getWalletBalances(req.user.id);
    ok(res, { wallets }, "Wallet balances");
  }),
];

/** GET /wallet/ledger — paginated, filterable wallet transaction history. */
export const ledger: RequestHandler[] = [
  validate(walletLedgerQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    if (!req.user) throw ApiError.unauthorized();
    const q = req.query as {
      wallet?: WalletType;
      type?: string;
      q?: string;
      page?: number;
      limit?: number;
    };
    const ledger = await getWalletLedger(req.user.id, {
      wallet: q.wallet,
      type: q.type,
      q: q.q,
      page: q.page ?? 1,
      limit: q.limit ?? 20,
    });
    ok(res, { ledger }, "Wallet ledger");
  }),
];