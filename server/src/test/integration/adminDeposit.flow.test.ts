import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { authed, closeApi, seedAdminAndLogin, seedUser, loginApi } from "../api.js";
import { hasTestDb, connectTestDb, clearDb, disconnectTestDb } from "../db.js";

/**
 * Admin manual deposit flow: an admin records a paid, package-less deposit for
 * a user → Main wallet credited as a `deposit` ledger row → the deposit shows up
 * in the user's deposit history. Each admin deposit is a distinct record (the
 * endpoint is not idempotent at the call level; the ledger credit itself is
 * idempotent per deposit id).
 */
describe.skipIf(!hasTestDb)("admin deposit flow", () => {
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

  it("records a paid deposit, credits Main/available, and lists it for the user", async () => {
    const admin = await seedAdminAndLogin();
    const target = await seedUser();

    const res = await authed(
      admin.accessToken,
      `/api/v1/admin/users/${target._id}/deposits`,
      { method: "POST", body: JSON.stringify({ amount: 50, memo: "offline USDT tx 0xabc" }) },
    );
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const deposit = res.body.data.deposit;
    expect(deposit.status).toBe("paid");
    expect(deposit.amountUsd).toBe(50);
    expect(deposit.currency).toBe("USDT-BEP20");
    // Admin deposits are package-less.
    expect(deposit.packageId).toBeNull();
    expect(deposit.userPackageId).toBeNull();
    expect(deposit.paidAt).not.toBeNull();
    // Main/available credited.
    expect(res.body.data.balance.available).toBe(50);

    // The user sees it in their deposit history.
    const userTokens = await loginApi(target.email, "secret123");
    const list = await authed<{ data: { deposits: { id: string; status: string; amountUsd: number }[] } }>(
      userTokens.accessToken,
      "/api/v1/payments/deposits",
    );
    expect(list.status).toBe(200);
    expect(list.body.data.deposits.length).toBe(1);
    expect(list.body.data.deposits[0].status).toBe("paid");
    expect(list.body.data.deposits[0].amountUsd).toBe(50);

    // And in their wallet balance.
    const wallet = await authed<{ data: { wallets: { main: { available: number } } } }>(
      userTokens.accessToken,
      "/api/v1/wallet",
    );
    expect(wallet.body.data.wallets.main.available).toBe(50);
  });

  it("rejects a non-positive amount", async () => {
    const admin = await seedAdminAndLogin();
    const target = await seedUser();

    const res = await authed(
      admin.accessToken,
      `/api/v1/admin/users/${target._id}/deposits`,
      { method: "POST", body: JSON.stringify({ amount: 0 }) },
    );
    expect(res.status).toBe(400);
  });

  it("creates a distinct deposit on each call (no endpoint-level dedupe)", async () => {
    const admin = await seedAdminAndLogin();
    const target = await seedUser();

    for (let i = 0; i < 2; i++) {
      const res = await authed(
        admin.accessToken,
        `/api/v1/admin/users/${target._id}/deposits`,
        { method: "POST", body: JSON.stringify({ amount: 25 }) },
      );
      expect(res.status).toBe(200);
    }

    const userTokens = await loginApi(target.email, "secret123");
    const list = await authed<{ data: { deposits: { id: string }[] } }>(
      userTokens.accessToken,
      "/api/v1/payments/deposits",
    );
    expect(list.body.data.deposits.length).toBe(2);

    const wallet = await authed<{ data: { wallets: { main: { available: number } } } }>(
      userTokens.accessToken,
      "/api/v1/wallet",
    );
    expect(wallet.body.data.wallets.main.available).toBe(50);
  });
});