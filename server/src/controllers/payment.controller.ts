import type { RequestHandler } from "express";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { isProd, isNowpaymentsConfigured } from "../config/env.js";
import { logger } from "../config/logger.js";
import { depositIdParamSchema } from "@zaminex/shared";
import {
  getDeposits,
  getDepositForUser,
  findDepositByInvoice,
  confirmDeposit,
} from "../services/deposit.service.js";
import { verifyWebhookSignature, PAID_STATUSES } from "../services/nowpayments.service.js";
import { Deposit, PaymentLog } from "../models/index.js";

const meta = (req: Parameters<RequestHandler>[0]) => ({ ip: req.ip, userAgent: req.headers["user-agent"] });

/** GET /payments/deposits — the user's deposits. */
export const myDeposits: RequestHandler[] = [
  asyncHandler(async (req, res) => {
    const deposits = await getDeposits(req.user!.id);
    ok(res, { deposits }, "Your deposits");
  }),
];

/** GET /payments/deposits/:id — single deposit status (ownership-checked). */
export const depositStatus: RequestHandler[] = [
  validate(depositIdParamSchema, "params"),
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
    const body = req.body as {
      id?: string;
      order_id?: string;
      payment_id?: string;
      payment_status?: string;
    };

    if (!verifyWebhookSignature(req)) {
      logger.warn("NOWPayments webhook: invalid signature");
      // Fire-and-forget: log the rejected event without ever blocking the 200.
      void PaymentLog.create({
        event: "webhook_received",
        received: false,
        invoiceId: body.order_id ?? body.id ?? null,
        status: body.payment_status ?? null,
        meta: { reason: "invalid_signature" },
      }).catch(() => undefined);
      return res.status(200).json({ success: true, received: false });
    }

    // Resolve the deposit by order_id (our deposit _id) or by invoice id.
    let deposit = body.order_id ? await findDepositByInvoice(body.order_id).catch(() => null) : null;
    if (!deposit && body.id) {
      deposit = await findDepositByInvoice(body.id).catch(() => null);
    }
    // The order_id is our deposit _id directly; fall back to a lookup by _id.
    if (!deposit && body.order_id) {
      deposit = await Deposit.findById(body.order_id).lean().catch(() => null);
    }

    const confirmed = Boolean(deposit && body.payment_status && PAID_STATUSES.has(body.payment_status));
    if (confirmed && deposit) {
      await confirmDeposit(deposit._id.toString(), body.payment_id ?? null, meta(req));
    }

    // Fire-and-forget: record the gateway event (deposit/user resolved, outcome).
    void PaymentLog.create({
      event: "webhook_received",
      received: true,
      deposit: deposit?._id ?? null,
      user: deposit?.user ?? null,
      paymentId: body.payment_id ?? null,
      invoiceId: body.order_id ?? body.id ?? null,
      status: body.payment_status ?? null,
      meta: { confirmed, order_id: body.order_id ?? null, payment_id: body.payment_id ?? null },
    }).catch(() => undefined);

    return res.status(200).json({ success: true, received: true });
  }),
];

/**
 * POST /payments/dev/simulate/:id — simulate a paid webhook for a sandbox
 * deposit (dev only, owner-only). Hidden (404) in production or when the live
 * gateway is configured.
 */
export const devSimulatePayment: RequestHandler[] = [
  validate(depositIdParamSchema, "params"),
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