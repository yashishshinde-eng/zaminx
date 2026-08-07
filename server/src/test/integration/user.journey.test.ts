import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { authed, closeApi, registerAndLogin } from "../api.js";
import { hasTestDb, connectTestDb, clearDb, disconnectTestDb } from "../db.js";

/**
 * User-side journey smoke: register a fresh user (sponsored by a seeded root
 * referrer) → log in → exercise the main authenticated read endpoints every
 * user page depends on. Asserts 200 + minimal shape, not business logic, so it
 * stays robust while still proving the wiring end-to-end at runtime.
 */
describe.skipIf(!hasTestDb)("user journey", () => {
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    await connectTestDb();
    await clearDb();
    const r = await registerAndLogin();
    accessToken = r.accessToken;
    userId = r.userId;
  });
  afterAll(async () => {
    await disconnectTestDb();
    await closeApi();
  });
  // Read-only journey: no per-test clearDb (dropDatabase on remote Atlas races
  // the immediate insert). One fresh user for the whole file is sufficient.

  it("GET /auth/me returns the logged-in user", async () => {
    const r = await authed<{ data: { user: { id: string; email: string } } }>(accessToken, "/api/v1/auth/me");
    expect(r.status).toBe(200);
    expect(r.body.data.user.id).toBe(userId);
  });

  it("GET /dashboard/summary returns 200", async () => {
    const r = await authed(accessToken, "/api/v1/dashboard/summary");
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
  });

  it("GET /wallet returns the three wallets", async () => {
    const r = await authed<{ data: { wallets: { main: { available: number }; bonus: { available: number }; trading: { available: number } } } }>(
      accessToken,
      "/api/v1/wallet",
    );
    expect(r.status).toBe(200);
    const w = r.body.data.wallets;
    expect(w.main).toBeDefined();
    expect(w.bonus).toBeDefined();
    expect(w.trading).toBeDefined();
    expect(typeof w.main.available).toBe("number");
  });

  it("GET /packages returns the catalog and /packages/mine the subscriptions", async () => {
    const cat = await authed<{ data: { packages: unknown[] } }>(accessToken, "/api/v1/packages");
    expect(cat.status).toBe(200);
    expect(Array.isArray(cat.body.data.packages)).toBe(true);

    const mine = await authed<{ data: { packages: unknown[] } }>(accessToken, "/api/v1/packages/mine");
    expect(mine.status).toBe(200);
    expect(Array.isArray(mine.body.data.packages)).toBe(true);
  });

  it("GET /payments/deposits returns 200 array", async () => {
    const r = await authed<{ data: { deposits: unknown[] } }>(accessToken, "/api/v1/payments/deposits");
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.data.deposits)).toBe(true);
  });

  it("GET /referrals/me and /referrals/direct return 200", async () => {
    const me = await authed(accessToken, "/api/v1/referrals/me");
    expect(me.status).toBe(200);
    const direct = await authed(accessToken, "/api/v1/referrals/direct");
    expect(direct.status).toBe(200);
  });

  it("GET /bonanzas returns 200", async () => {
    const r = await authed(accessToken, "/api/v1/bonanzas");
    expect(r.status).toBe(200);
  });

  it("GET /reports/:kind returns 200 for each user report kind", async () => {
    const kinds = ["deposits", "withdrawals", "wallet", "trading", "direct", "team", "community", "rank", "bonanza"];
    for (const kind of kinds) {
      const r = await authed(accessToken, `/api/v1/reports/${kind}`);
      expect(r.status).toBe(200);
      expect(r.body.success).toBe(true);
    }
  });

  it("GET /wallet/ledger returns 200", async () => {
    const r = await authed(accessToken, "/api/v1/wallet/ledger");
    expect(r.status).toBe(200);
  });
});