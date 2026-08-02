import crypto from "node:crypto";
import { env, isNowpaymentsConfigured, isProd } from "../config/env.js";
import { logger } from "../config/logger.js";
import { ApiError } from "../utils/ApiError.js";
import { withRetry } from "../utils/retry.js";
import { getSetting } from "./setting.service.js";
import type { Request } from "express";

/** Result of creating an invoice — payment instructions for the user. */
export interface InvoiceResult {
  nowpaymentsInvoiceId: string;
  payAddress: string;
  payAmount: number;
  hostedUrl: string | null;
  sandbox: boolean;
}

const SANDBOX_PAY_ADDRESS = "0xSANDBOX000000000000000000000000000000dEaD";

/**
 * A failure from the NOWPayments gateway. Carries the HTTP `status` (0 for a
 * non-HTTP failure such as a malformed response) and an `isTimeout` flag so the
 * retry helper (`utils/retry.isTransientError`) can decide retryability without
 * import coupling — it duck-types on `status`/`isTimeout`/`name`.
 */
export class GatewayError extends Error {
  public readonly status: number;
  public readonly isTimeout: boolean;
  constructor(message: string, status: number, isTimeout = false) {
    super(message);
    this.name = "GatewayError";
    this.status = status;
    this.isTimeout = isTimeout;
  }
}

/** Resolved NOWPayments non-secret config (Settings with env fallback). The
 * API key + IPN secret stay env-only (secret). */
export interface NowpaymentsConfig {
  baseUrl: string;
  payCurrency: string;
  sandbox: boolean;
}

/** Read the live NOWPayments config. `sandbox` defaults to "no credentials"
 * so a fresh install runs the mock flow until the admin flips it. */
export async function getNowpaymentsConfig(): Promise<NowpaymentsConfig> {
  const baseUrl = await getSetting<string>("payment.baseUrl", env.NOWPAYMENTS_BASE_URL);
  const payCurrency = await getSetting<string>("payment.payCurrency", env.NOWPAYMENTS_PAY_CURRENCY);
  const sandbox = await getSetting<boolean>("payment.sandbox", !isNowpaymentsConfigured());
  return { baseUrl, payCurrency, sandbox };
}

/**
 * Create a NOWPayments invoice for a deposit. When credentials are configured
 * AND sandbox mode is off this calls the live gateway; otherwise a sandbox
 * mock is returned so the full activate → pay → confirm flow runs locally
 * without a NOWPayments account.
 *
 * @param amountUsd  Deposit amount in USD (= package price snapshot)
 * @param orderId   Stable id linking the IPN webhook back to this deposit
 */
export async function createInvoice(input: {
  amountUsd: number;
  orderId: string;
  description: string;
}): Promise<InvoiceResult> {
  const cfg = await getNowpaymentsConfig();
  // Production must never silently route deposits through the sandbox mock
  // when the gateway credentials are missing — that would create fake invoices.
  if (isProd && !isNowpaymentsConfigured()) {
    throw ApiError.badRequest("Payment gateway not configured");
  }
  if (cfg.sandbox || !isNowpaymentsConfigured()) {
    // Sandbox: no network. 1:1 USD→USDT for the mock amount.
    return {
      nowpaymentsInvoiceId: `sandbox-${input.orderId}`,
      payAddress: SANDBOX_PAY_ADDRESS,
      payAmount: input.amountUsd,
      hostedUrl: null,
      sandbox: true,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${cfg.baseUrl}/invoice`, {
      method: "POST",
      headers: {
        "x-api-key": env.NOWPAYMENTS_API_KEY!,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        price_amount: input.amountUsd,
        price_currency: "usd",
        pay_currency: cfg.payCurrency,
        order_id: input.orderId,
        order_description: input.description,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new GatewayError(`NOWPayments invoice API ${res.status}: ${text.slice(0, 200)}`, res.status);
    }

    const body = (await res.json()) as {
      id?: string;
      pay_address?: string;
      pay_amount?: number;
      invoice_url?: string;
    };

    if (!body.id || !body.pay_address) {
      // Malformed response — not a transient gateway error. status 0 ⇒ not retried.
      throw new GatewayError("NOWPayments invoice response missing id or pay_address", 0);
    }

    return {
      nowpaymentsInvoiceId: String(body.id),
      payAddress: body.pay_address,
      payAmount: Number(body.pay_amount ?? input.amountUsd),
      hostedUrl: body.invoice_url ?? null,
      sandbox: false,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Verify a NOWPayments IPN webhook signature (HMAC-SHA512 of the raw body).
 * In sandbox mode (no credentials) verification is skipped — the dev simulate
 * endpoint is the trusted entry point instead.
 */
export function verifyWebhookSignature(req: Request): boolean {
  if (!isNowpaymentsConfigured()) return !isProd; // dev trusts the simulate path; prod rejects unsigned payloads

  const sig = req.headers["x-nowpayments-sig"];
  if (!sig || typeof sig !== "string" || !req.rawBody) return false;

  const expected = crypto
    .createHmac("sha512", env.NOWPAYMENTS_IPN_SECRET!)
    .update(req.rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    logger.warn("NOWPayments webhook signature length mismatch");
    return false;
  }
}

/** IPN payment statuses that count as a confirmed/completed payment. */
export const PAID_STATUSES = new Set(["confirmed", "sending", "finished"]);

/**
 * Fetch the live payment status of a NOWPayments invoice (Phase 18
 * payment-verification poller). Used to catch deposits whose IPN webhook was
 * missed — the webhook remains the primary confirmation path. Only meaningful
 * when the gateway is configured; callers guard with `isNowpaymentsConfigured()`.
 * Returns the gateway `payment_status` (e.g. "finished", "waiting") or `null`
 * when absent; throws a `GatewayError` on a non-OK response so the poller can
 * count it as an error.
 *
 * This is a safe idempotent GET, so the fetch is wrapped in `withRetry` (3
 * attempts, exponential backoff) — a transient 5xx/timeout is absorbed within
 * the poll tick instead of waiting 15 minutes for the next run. `createInvoice`
 * (a POST) is deliberately NOT retried to avoid duplicate invoices.
 */
export async function getInvoiceStatus(invoiceId: string): Promise<string | null> {
  const cfg = await getNowpaymentsConfig();
  // Each attempt gets its own AbortController + 10s timeout; `withRetry` runs the
  // inner fn fresh per attempt so a timeout on attempt 1 doesn't poison attempt 2.
  return withRetry(
    async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      try {
        const res = await fetch(`${cfg.baseUrl}/invoice/${invoiceId}`, {
          method: "GET",
          headers: { "x-api-key": env.NOWPAYMENTS_API_KEY! },
          signal: controller.signal,
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new GatewayError(
            `NOWPayments invoice status API ${res.status}: ${text.slice(0, 200)}`,
            res.status,
          );
        }
        const body = (await res.json()) as { payment_status?: string };
        return body.payment_status ?? null;
      } catch (err) {
        // Surface fetch timeouts (AbortError) as a retryable GatewayError so
        // `isTransientError` sees a uniform shape; otherwise rethrow as-is
        // (AbortError is already transient by name, so this is mostly cosmetic).
        if (err instanceof Error && err.name === "AbortError") {
          throw new GatewayError(`NOWPayments invoice status timeout: ${invoiceId}`, 0, true);
        }
        throw err;
      } finally {
        clearTimeout(timeout);
      }
    },
    { attempts: 3, baseDelayMs: 1000, maxDelayMs: 8000 },
  );
}