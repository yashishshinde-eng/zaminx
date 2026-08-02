import { describe, it, expect } from "vitest";
import { verifyPendingDeposits } from "../../services/paymentVerify.service.js";

/**
 * `verifyPendingDeposits` short-circuits to `{ skipped: true }` when the
 * NOWPayments gateway is unconfigured — without any DB query — so this unit
 * test needs no Mongo. The active (configured) branch is exercised by the
 * payment integration test against a live DB.
 */
describe("verifyPendingDeposits", () => {
  it("skips when the gateway is unconfigured (test env has no NOWPayments creds)", async () => {
    const result = await verifyPendingDeposits();
    expect(result.skipped).toBe(true);
    expect(result.processed).toBe(0);
    expect(result.confirmed).toBe(0);
    expect(result.errors).toBe(0);
  });
});