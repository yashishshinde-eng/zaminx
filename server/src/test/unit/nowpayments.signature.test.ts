import { describe, it, expect, vi } from "vitest";
import crypto from "node:crypto";
import type { Request } from "express";

/**
 * Configured-branch HMAC tests. The frozen `env` is replaced via a scoped
 * `vi.mock` (using `importActual` so every other env field stays faithful).
 * This avoids `vi.resetModules`, which would re-evaluate `User.model.ts` and
 * throw Mongoose's `OverwriteModelError`. The mock is file-scoped, so other
 * test files (and the unconfigured-branch test) still see the real env.
 */
vi.mock("../../config/env.js", async (importOriginal) => {
  const actual = (await importOriginal()) as typeof import("../../config/env.js");
  return {
    ...actual,
    env: { ...actual.env, NOWPAYMENTS_API_KEY: "k", NOWPAYMENTS_IPN_SECRET: "s" },
    isNowpaymentsConfigured: () => true,
  };
});

import { verifyWebhookSignature } from "../../services/nowpayments.service.js";

function fakeReq(rawBody: string, sig?: string): Request {
  const headers: Record<string, string> = {};
  if (sig !== undefined) headers["x-nowpayments-sig"] = sig;
  return { headers, rawBody: Buffer.from(rawBody) } as unknown as Request;
}

describe("verifyWebhookSignature (configured gateway)", () => {
  it("verifies a valid HMAC-SHA512 signature", () => {
    const raw = JSON.stringify({ id: "d1", payment_status: "confirmed", order_id: "o1", price_amount: 100 });
    const sig = crypto.createHmac("sha512", "s").update(raw).digest("hex");
    expect(verifyWebhookSignature(fakeReq(raw, sig))).toBe(true);
  });

  it("rejects a tampered body", () => {
    const raw = JSON.stringify({ id: "d1" });
    const sig = crypto.createHmac("sha512", "s").update(raw).digest("hex");
    expect(verifyWebhookSignature(fakeReq(raw + "tampered", sig))).toBe(false);
  });

  it("rejects a missing signature header", () => {
    expect(verifyWebhookSignature(fakeReq("body"))).toBe(false);
  });

  it("rejects a length-mismatched signature (timingSafeEqual throws → false)", () => {
    expect(verifyWebhookSignature(fakeReq("body", "tooshort"))).toBe(false);
  });
});