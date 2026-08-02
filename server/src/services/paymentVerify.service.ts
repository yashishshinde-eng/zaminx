import { Deposit } from "../models/index.js";
import { logger } from "../config/logger.js";
import { isNowpaymentsConfigured } from "../config/env.js";
import { getInvoiceStatus, PAID_STATUSES } from "./nowpayments.service.js";
import { confirmDeposit } from "./deposit.service.js";

/** Result of a payment-verification poll. `skipped` is true when the gateway
 * isn't configured (dev/no-creds) — the poll is a no-op then. */
export interface PaymentVerifySummary {
  processed: number;
  confirmed: number;
  errors: number;
  skipped: boolean;
}

/** Grace period before a still-pending deposit is considered "missed IPN". */
const STALE_AFTER_MS = 10 * 60_000;

/**
 * Poll NOWPayments for deposits whose IPN webhook was missed and confirm any
 * that are now paid (Phase 18 `payment_verify` cron). The webhook remains the
 * primary confirmation path; this is a best-effort safety net that runs every
 * 15 minutes. Only real (non-sandbox) invoices older than the grace period are
 * checked, so the webhook has time to arrive first.
 *
 * Each deposit is checked in its own try/catch so one failure doesn't abort the
 * batch. `confirmDeposit` is idempotent (no-ops on a non-pending deposit), so
 * racing with a webhook is safe.
 */
export async function verifyPendingDeposits(): Promise<PaymentVerifySummary> {
  if (!isNowpaymentsConfigured()) {
    return { processed: 0, confirmed: 0, errors: 0, skipped: true };
  }

  const cutoff = new Date(Date.now() - STALE_AFTER_MS);
  const pending = await Deposit.find({
    status: "pending",
    sandbox: { $ne: true },
    nowpaymentsInvoiceId: { $exists: true, $ne: null },
    createdAt: { $lte: cutoff },
  })
    .lean()
    .catch((err: unknown) => {
      // A DB failure here used to be swallowed silently, making the poller look
      // healthy while processing nothing. Surface it so it's visible in logs.
      logger.warn("payment_verify: pending-deposit query failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      return [];
    });

  let confirmed = 0;
  let errors = 0;

  for (const d of pending) {
    const depositId = d._id.toString();
    const invoiceId = d.nowpaymentsInvoiceId as string;
    try {
      const status = await getInvoiceStatus(invoiceId);
      if (status && PAID_STATUSES.has(status)) {
        await confirmDeposit(depositId, null, { ip: "cron", userAgent: "payment-verify" });
        confirmed += 1;
      }
    } catch (err) {
      errors += 1;
      logger.warn("payment_verify: deposit status check failed", {
        depositId,
        invoiceId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { processed: pending.length, confirmed, errors, skipped: false };
}