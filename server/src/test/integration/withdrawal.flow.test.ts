import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { authed, closeApi, registerAndLogin, seedPackage, seedAdminAndLogin } from "../api.js";
import { hasTestDb, connectTestDb, clearDb, disconnectTestDb } from "../db.js";

async function fundWallet(amount = 100): Promise<{ accessToken: string; depositId: string }> {
  const { accessToken } = await registerAndLogin();
  const pkg = await seedPackage({ priceUsd: amount });
  await authed(accessToken, "/api/v1/packages/activate", {
    method: "POST",
    body: JSON.stringify({ packageId: pkg._id }),
  });
  const list = await authed<{ data: { deposits: { _id: string; status: string }[] } }>(
    accessToken,
    "/api/v1/payments/deposits",
  );
  const id = list.body.data.deposits.find((d) => d.status === "pending")!._id;
  await authed(accessToken, `/api/v1/payments/dev/simulate/${id}`, { method: "POST" });
  return { accessToken, depositId: id };
}

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
    const { accessToken } = await fundWallet(100);
    const r = await authed(accessToken, "/api/v1/withdrawals", {
      method: "POST",
      body: JSON.stringify({ wallet: "main", amount: 40 }),
    });
    expect(r.status).toBe(201);
    expect(r.body.data.withdrawal).toBeTruthy();
    expect(r.body.data.withdrawal.status).toBe("paid");
  });

  it("rejects a withdrawal below the $15 minimum", async () => {
    const { accessToken } = await fundWallet(100);
    const r = await authed(accessToken, "/api/v1/withdrawals", {
      method: "POST",
      body: JSON.stringify({ wallet: "main", amount: 5 }),
    });
    expect(r.status).toBe(400);
    expect(r.body.success).toBe(false);
    expect(String(r.body.message)).toMatch(/15/);
  });

  it("rejects a withdrawal exceeding the available balance", async () => {
    const { accessToken } = await fundWallet(100);
    const r = await authed(accessToken, "/api/v1/withdrawals", {
      method: "POST",
      body: JSON.stringify({ wallet: "main", amount: 9999 }),
    });
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(r.body.success).toBe(false);
  });

  it("returns 409 for admin review/approve/pay on an already-paid withdrawal", async () => {
    const { accessToken: userToken } = await fundWallet(100);
    const admin = await seedAdminAndLogin();

    const submit = await authed(userToken, "/api/v1/withdrawals", {
      method: "POST",
      body: JSON.stringify({ wallet: "main", amount: 25 }),
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
    const { accessToken } = await fundWallet(100);
    const submit = await authed(accessToken, "/api/v1/withdrawals", {
      method: "POST",
      body: JSON.stringify({ wallet: "main", amount: 20 }),
    });
    expect(submit.status).toBe(201);
    const wid = widOf(submit.body.data.withdrawal);
    const cancel = await authed(accessToken, `/api/v1/withdrawals/${wid}/cancel`, { method: "POST" });
    expect(cancel.status).toBe(409);
  });
});