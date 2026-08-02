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

/**
 * Phase 20 — withdrawal flow integration test. From a funded main wallet:
 * submit → 201; insufficient balance → 4xx; admin review → approve → pay;
 * plus a user cancel path.
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

  it("submits a withdrawal from a funded main wallet", async () => {
    const { accessToken } = await fundWallet(100);
    const r = await authed(accessToken, "/api/v1/withdrawals", {
      method: "POST",
      body: JSON.stringify({ wallet: "main", amount: 40 }),
    });
    expect(r.status).toBe(201);
    expect(r.body.data.withdrawal).toBeTruthy();
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

  it("runs the admin review → approve → pay lifecycle", async () => {
    const { accessToken: userToken } = await fundWallet(100);
    const admin = await seedAdminAndLogin();

    const submit = await authed(userToken, "/api/v1/withdrawals", {
      method: "POST",
      body: JSON.stringify({ wallet: "main", amount: 25 }),
    });
    expect(submit.status).toBe(201);
    const wid = submit.body.data.withdrawal._id ?? submit.body.data.withdrawal.id;

    const adminList = await authed(admin.accessToken, "/api/v1/withdrawals/admin");
    expect(adminList.status).toBe(200);

    const review = await authed(admin.accessToken, `/api/v1/withdrawals/admin/${wid}/review`, { method: "POST", body: "{}" });
    expect(review.status).toBe(200);

    const approve = await authed(admin.accessToken, `/api/v1/withdrawals/admin/${wid}/approve`, { method: "POST", body: "{}" });
    expect(approve.status).toBe(200);

    const pay = await authed(admin.accessToken, `/api/v1/withdrawals/admin/${wid}/pay`, { method: "POST", body: "{}" });
    expect(pay.status).toBe(200);
    expect(pay.body.data.withdrawal.status).toBe("paid");
  });

  it("lets a user cancel their own pending withdrawal", async () => {
    const { accessToken } = await fundWallet(100);
    const submit = await authed(accessToken, "/api/v1/withdrawals", {
      method: "POST",
      body: JSON.stringify({ wallet: "main", amount: 10 }),
    });
    expect(submit.status).toBe(201);
    const wid = submit.body.data.withdrawal._id ?? submit.body.data.withdrawal.id;
    const cancel = await authed(accessToken, `/api/v1/withdrawals/${wid}/cancel`, { method: "POST" });
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.withdrawal.status).toBe("cancelled");
  });
});