import crypto from "node:crypto";
import { env, isNowpaymentsConfigured } from "../config/env.js";
import { logger } from "../config/logger.js";
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
 * Create a NOWPayments invoice for a deposit. When credentials are configured
 * this calls the live gateway; otherwise a sandbox mock is returned so the full
 * activate → pay → confirm flow runs locally without a NOWPayments account.
 *
 * @param amountUsd  Deposit amount in USD (= package price snapshot)
 * @param orderId   Stable id linking the IPN webhook back to this deposit
 */
export async function createInvoice(input: {
  amountUsd: number;
  orderId: string;
  description: string;
}): Promise<InvoiceResult> {
  if (!isNowpaymentsConfigured()) {
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
    const res = await fetch(`${env.NOWPAYMENTS_BASE_URL}/invoice`, {
      method: "POST",
      headers: {
        "x-api-key": env.NOWPAYMENTS_API_KEY!,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        price_amount: input.amountUsd,
        price_currency: "usd",
        pay_currency: env.NOWPAYMENTS_PAY_CURRENCY,
        order_id: input.orderId,
        order_description: input.description,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`NOWPayments invoice API ${res.status}: ${text.slice(0, 200)}`);
    }

    const body = (await res.json()) as {
      id?: string;
      pay_address?: string;
      pay_amount?: number;
      invoice_url?: string;
    };

    if (!body.id || !body.pay_address) {
      throw new Error("NOWPayments invoice response missing id or pay_address");
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
  if (!isNowpaymentsConfigured()) return true; // sandbox: dev simulate path is trusted

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