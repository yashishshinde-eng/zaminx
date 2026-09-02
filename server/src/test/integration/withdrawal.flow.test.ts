import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { authed, closeApi, fundActiveUser, fundWallet, registerAndLogin, seedPackage, seedAdminAndLogin } from "../api.js";
import { hasTestDb, connectTestDb, clearDb, disconnectTestDb } from "../db.js";

/** Withdrawal row shape from the API (id may be `_id` or `id`). */
function widOf(w: { _id?: string; id?: string }): string {
  return (w._id ?? w.id)!;
}

/**
 * Withdrawal flow — spec-aligned. Submissions auto-approve: the request is born
 * `paid` (available → onHold → debited) and the on-chain USDT payout is a
 * deferred manual step. Minimum withdrawal is $15. Legacy admin
 * review/approve/pay and user-cancel return 409 on already-`paid` rows.
 */
describe.skipIf(!hasTestDb)("withdrawal flow", () => {
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

  it("auto-approves a withdrawal from a funded main wallet (status paid)", async () => {
    const { accessToken } = await fundActiveUser(100);
    const r = await authed(accessToken, "/api/v1/withdrawals", {
      method: "POST",
      body: JSON.stringify({ wallet: "main", amount: 40, transactionPassword: "1234" }),
    });
    expect(r.status).toBe(201);
    expect(r.body.data.withdrawal).toBeTruthy();
    expect(r.body.data.withdrawal.status).toBe("paid");
  });

  it("rejects a withdrawal below the $15 minimum", async () => {
    const { accessToken } = await fundActiveUser(100);
    const r = await authed(accessToken, "/api/v1/withdrawals", {
      method: "POST",
      body: JSON.stringify({ wallet: "main", amount: 5, transactionPassword: "1234" }),
    });
    expect(r.status).toBe(400);
    expect(r.body.success).toBe(false);
    expect(String(r.body.message)).toMatch(/15/);
  });

  it("rejects a withdrawal exceeding the available balance", async () => {
    const { accessToken } = await fundActiveUser(100);
    const r = await authed(accessToken, "/api/v1/withdrawals", {
      method: "POST",
      body: JSON.stringify({ wallet: "main", amount: 9999, transactionPassword: "1234" }),
    });
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(r.body.success).toBe(false);
  });

  it("rejects a withdrawal with an incorrect transaction PIN", async () => {
    const { accessToken } = await fundActiveUser(100);
    const r = await authed(accessToken, "/api/v1/withdrawals", {
      method: "POST",
      body: JSON.stringify({ wallet: "main", amount: 40, transactionPassword: "0000" }),
    });
    expect(r.status).toBe(400);
    expect(r.body.success).toBe(false);
    expect(String(r.body.message)).toMatch(/PIN/i);
  });

  it("returns 409 for admin review/approve/pay on an already-paid withdrawal", async () => {
    const { accessToken: userToken } = await fundActiveUser(100);
    const admin = await seedAdminAndLogin();

    const submit = await authed(userToken, "/api/v1/withdrawals", {
      method: "POST",
      body: JSON.stringify({ wallet: "main", amount: 25, transactionPassword: "1234" }),
    });
    expect(submit.status).toBe(201);
    expect(submit.body.data.withdrawal.status).toBe("paid");
    const wid = widOf(submit.body.data.withdrawal);

    const adminList = await authed(admin.accessToken, "/api/v1/withdrawals/admin");
    expect(adminList.status).toBe(200);

    const review = await authed(admin.accessToken, `/api/v1/withdrawals/admin/${wid}/review`, { method: "POST", body: "{}" });
    expect(review.status).toBe(409);

    const approve = await authed(admin.accessToken, `/api/v1/withdrawals/admin/${wid}/approve`, { method: "POST", body: "{}" });
    expect(approve.status).toBe(409);

    const pay = await authed(admin.accessToken, `/api/v1/withdrawals/admin/${wid}/pay`, { method: "POST", body: "{}" });
    expect(pay.status).toBe(409);
  });

  it("returns 409 when a user tries to cancel an already-paid withdrawal", async () => {
    const { accessToken } = await fundActiveUser(100);
    const submit = await authed(accessToken, "/api/v1/withdrawals", {
      method: "POST",
      body: JSON.stringify({ wallet: "main", amount: 20, transactionPassword: "1234" }),
    });
    expect(submit.status).toBe(201);
    const wid = widOf(submit.body.data.withdrawal);
    const cancel = await authed(accessToken, `/api/v1/withdrawals/${wid}/cancel`, { method: "POST" });
    expect(cancel.status).toBe(409);
  });

  it("blocks withdrawals for an inactive user until they activate a package", async () => {
    // A freshly registered user is inactive (no package yet) but can fund their wallet.
    const { accessToken } = await registerAndLogin();
    await fundWallet(100, accessToken);

    // Withdrawal is blocked — the user has not activated a package.
    const blocked = await authed(accessToken, "/api/v1/withdrawals", {
      method: "POST",
      body: JSON.stringify({ wallet: "main", amount: 20, transactionPassword: "1234" }),
    });
    expect(blocked.status).toBe(403);
    expect(blocked.body.success).toBe(false);

    // Activate a package from the funded wallet → user becomes active.
    const pkg = await seedPackage({ priceUsd: 50 });
    const act = await authed(accessToken, "/api/v1/packages/activate", {
      method: "POST",
      body: JSON.stringify({ packageId: pkg._id }),
    });
    expect(act.status).toBe(201);

    // Withdrawal now succeeds (50 funded − 50 package = 0... so fund more first).
    // The activation debited $50, leaving $50 — a $20 withdrawal fits.
    const ok = await authed(accessToken, "/api/v1/withdrawals", {
      method: "POST",
      body: JSON.stringify({ wallet: "main", amount: 20, transactionPassword: "1234" }),
    });
    expect(ok.status).toBe(201);
    expect(ok.body.data.withdrawal.status).toBe("paid");
  });
});