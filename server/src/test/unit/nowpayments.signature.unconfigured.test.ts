import { describe, it, expect } from "vitest";
import type { Request } from "express";
import { verifyWebhookSignature } from "../../services/nowpayments.service.js";

/**
 * Unconfigured-branch: with no NOWPayments credentials (the test env), the
 * gateway is unconfigured and `verifyWebhookSignature` trusts the dev simulate
 * path (`!isProd` → true). NODE_ENV=test ⇒ isProd=false ⇒ returns true.
 */
describe("verifyWebhookSignature (unconfigured gateway)", () => {
  it("trusts the dev path when the gateway is unconfigured", () => {
    const req = { headers: {}, rawBody: Buffer.from("anything") } as unknown as Request;
    expect(verifyWebhookSignature(req)).toBe(true);
  });
});