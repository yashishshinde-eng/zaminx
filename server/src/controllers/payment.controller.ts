import type { RequestHandler } from "express";
import { authenticate } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { isProd, isNowpaymentsConfigured } from "../config/env.js";
import { logger } from "../config/logger.js";
import {
  getDeposits,
  getDepositForUser,
  findDepositByInvoice,
  confirmDeposit,
} from "../services/deposit.service.js";
import { verifyWebhookSignature, PAID_STATUSES } from "../services/nowpayments.service.js";
import { Deposit } from "../models/index.js";

const meta = (req: Parameters<RequestHandler>[0]) => ({ ip: req.ip, userAgent: req.headers["user-agent"] });

/** GET /payments/deposits — the user's deposits. */
export const myDeposits: RequestHandler[] = [
  authenticate,
  asyncHandler(async (req, res) => {
    const deposits = await getDeposits(req.user!.id);
    ok(res, { deposits }, "Your deposits");
  }),
];

/** GET /payments/deposits/:id — single deposit status (ownership-checked). */
export const depositStatus: RequestHandler[] = [
  authenticate,
  asyncHandler(async (req, res) => {
    const id = (req.params as { id?: string }).id;
    if (!id) throw ApiError.badRequest("Deposit id is required");
    const deposit = await getDepositForUser(req.user!.id, id);
    ok(res, { deposit }, "Deposit status");
  }),
];

/**
 * POST /payments/nowpayments/webhook — NOWPayments IPN endpoint (public).
 * Signature-verified (sandbox skips verification). Always responds 200 so
 * NOWPayments does not retry; processing is idempotent.
 */
export const nowpaymentsWebhook: RequestHandler[] = [
  asyncHandler(async (req, res) => {
    if (!verifyWebhookSignature(req)) {
      logger.warn("NOWPayments webhook: invalid signature");
      return res.status(200).json({ success: true, received: false });
    }

    const body = req.body as {
      id?: string;
      order_id?: string;
      payment_id?: string;
      payment_status?: string;
    };

    // Resolve the deposit by order_id (our deposit _id) or by invoice id.
    let deposit = body.order_id ? await findDepositByInvoice(body.order_id).catch(() => null) : null;
    if (!deposit && body.id) {
      deposit = await findDepositByInvoice(body.id).catch(() => null);
    }
    // The order_id is our deposit _id directly; fall back to a lookup by _id.
    if (!deposit && body.order_id) {
      deposit = await Deposit.findById(body.order_id).lean().catch(() => null);
    }

    if (deposit && body.payment_status && PAID_STATUSES.has(body.payment_status)) {
      await confirmDeposit(deposit._id.toString(), body.payment_id ?? null, meta(req));
    }

    return res.status(200).json({ success: true, received: true });
  }),
];

/**
 * POST /payments/dev/simulate/:id — simulate a paid webhook for a sandbox
 * deposit (dev only, owner-only). Hidden (404) in production or when the live
 * gateway is configured.
 */
export const devSimulatePayment: RequestHandler[] = [
  authenticate,
  asyncHandler(async (req, res) => {
    if (isProd || isNowpaymentsConfigured()) throw ApiError.notFound("Not found");

    const id = (req.params as { id?: string }).id;
    if (!id) throw ApiError.badRequest("Deposit id is required");

    const deposit = await Deposit.findById(id).lean();
    if (!deposit) throw ApiError.notFound("Deposit not found");
    if (deposit.user.toString() !== req.user!.id) throw ApiError.notFound("Deposit not found"); // no leak
    if (!deposit.sandbox) throw ApiError.badRequest("Only sandbox deposits can be simulated");
    if (deposit.status !== "pending") throw ApiError.conflict("Deposit is not pending");

    const updated = await confirmDeposit(id, `sandbox-payment-${id}`, meta(req));
    ok(res, { deposit: updated }, "Payment simulated");
  }),
];