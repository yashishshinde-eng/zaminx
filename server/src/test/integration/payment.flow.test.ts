import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { authed, closeApi, registerAndLogin, seedPackage } from "../api.js";
import { hasTestDb, connectTestDb, clearDb, disconnectTestDb } from "../db.js";

/**
 * Phase 20 — payment flow integration test (sandbox, no live gateway). Activate
 * a package → pending deposit → dev-simulate the paid webhook → confirmed →
 * idempotency (second simulate is rejected, no double credit).
 */
describe.skipIf(!hasTestDb)("payment flow", () => {
  beforeAll(async () => {
    await connectTestDb();
  });
  afterAll(async () => {
    await disconnectTestDb();
    await closeApi();
  });
  beforeEach(async () => {
    await clearDb();
  });

  it("activates a package, simulates payment, and confirms the deposit", async () => {
    const { accessToken } = await registerAndLogin();
    const pkg = await seedPackage({ priceUsd: 100 });

    const act = await authed(accessToken, "/api/v1/packages/activate", {
      method: "POST",
      body: JSON.stringify({ packageId: pkg._id }),
    });
    expect(act.status).toBe(201);
    expect(act.body.success).toBe(true);
    expect(act.body.data.payment.sandbox).toBe(true);

    const deposits = await authed<{ data: { deposits: { _id: string; status: string }[] } }>(
      accessToken,
      "/api/v1/payments/deposits",
    );
    expect(deposits.status).toBe(200);
    const pending = deposits.body.data.deposits.find((d) => d.status === "pending");
    expect(pending).toBeTruthy();
    const depositId = pending!._id;

    const sim = await authed(accessToken, `/api/v1/payments/dev/simulate/${depositId}`, { method: "POST" });
    expect(sim.status).toBe(200);
    expect(sim.body.data.deposit.status).toBe("confirmed");

    const after = await authed<{ data: { deposits: { status: string }[] } }>(
      accessToken,
      "/api/v1/payments/deposits",
    );
    const confirmed = after.body.data.deposits.find((d) => d.status === "confirmed");
    expect(confirmed).toBeTruthy();
  });

  it("is idempotent: a second simulate does not double-credit", async () => {
    const { accessToken } = await registerAndLogin();
    const pkg = await seedPackage({ priceUsd: 100 });
    await authed(accessToken, "/api/v1/packages/activate", {
      method: "POST",
      body: JSON.stringify({ packageId: pkg._id }),
    });
    const list = await authed<{ data: { deposits: { _id: string; status: string }[] } }>(
      accessToken,
      "/api/v1/payments/deposits",
    );
    const id = list.body.data.deposits.find((d) => d.status === "pending")!._id;

    const first = await authed(accessToken, `/api/v1/payments/dev/simulate/${id}`, { method: "POST" });
    expect(first.status).toBe(200);

    // Already confirmed → not pending → 409, no second confirmation.
    const second = await authed(accessToken, `/api/v1/payments/dev/simulate/${id}`, { method: "POST" });
    expect(second.status).toBe(409);

    const after = await authed<{ data: { deposits: { _id: string }[] } }>(
      accessToken,
      "/api/v1/payments/deposits",
    );
    expect(after.body.data.deposits.length).toBe(1);
  });
});