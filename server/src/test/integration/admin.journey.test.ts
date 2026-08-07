import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { authed, closeApi, seedAdminAndLogin, seedUser } from "../api.js";
import { hasTestDb, connectTestDb, clearDb, disconnectTestDb } from "../db.js";

/**
 * Admin-side journey smoke: seed an admin → exercise the main admin read
 * endpoints every admin page depends on. Single setup (no per-test
 * dropDatabase) to avoid the remote-Atlas drop/insert race. Asserts 200 +
 * success envelope, not business logic.
 */
describe.skipIf(!hasTestDb)("admin journey", () => {
  let accessToken: string;
  let targetUserId: string;

  beforeAll(async () => {
    await connectTestDb();
    await clearDb();
    const admin = await seedAdminAndLogin();
    accessToken = admin.accessToken;
    const target = await seedUser();
    targetUserId = target._id;
  });
  afterAll(async () => {
    await disconnectTestDb();
    await closeApi();
  });

  it("GET /admin/dashboard returns 200", async () => {
    const r = await authed(accessToken, "/api/v1/admin/dashboard");
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
  });

  it("GET /admin/users returns a paginated list", async () => {
    const r = await authed<{ data: { users: { items: unknown[] } } }>(accessToken, "/api/v1/admin/users");
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.data.users.items)).toBe(true);
  });

  it("GET /admin/users/:id returns the seeded user", async () => {
    const r = await authed<{ data: { user: { id: string } } }>(accessToken, `/api/v1/admin/users/${targetUserId}`);
    expect(r.status).toBe(200);
    expect(r.body.data.user.id).toBe(targetUserId);
  });

  it("admin settings endpoints all return 200", async () => {
    for (const p of [
      "/api/v1/admin/settings/compensation",
      "/api/v1/admin/settings/cms",
      "/api/v1/admin/settings/smtp",
      "/api/v1/admin/settings/payment",
      "/api/v1/admin/settings/maintenance",
    ]) {
      const r = await authed(accessToken, p);
      expect(r.status).toBe(200);
    }
  });

  it("GET /admin/logs returns 200", async () => {
    const r = await authed(accessToken, "/api/v1/admin/logs");
    expect(r.status).toBe(200);
  });

  it("GET /compensation/overview returns 200", async () => {
    const r = await authed(accessToken, "/api/v1/compensation/overview");
    expect(r.status).toBe(200);
  });

  it("GET /ranks returns 200", async () => {
    const r = await authed<{ data: { ranks: unknown[] } }>(accessToken, "/api/v1/ranks");
    expect(r.status).toBe(200);
  });

  it("GET /bonanzas/admin returns 200", async () => {
    const r = await authed(accessToken, "/api/v1/bonanzas/admin");
    expect(r.status).toBe(200);
  });

  it("GET /withdrawals/admin returns 200", async () => {
    const r = await authed(accessToken, "/api/v1/withdrawals/admin");
    expect(r.status).toBe(200);
  });

  it("GET /reports/admin/:kind returns 200 for each admin report kind", async () => {
    const kinds = ["users", "deposits", "withdrawals", "income", "wallet", "gateway", "bonanza", "activity"];
    for (const kind of kinds) {
      const r = await authed(accessToken, `/api/v1/reports/admin/${kind}`);
      expect(r.status).toBe(200);
      expect(r.body.success).toBe(true);
    }
  });

  it("non-admin cannot reach /admin (403)", async () => {
    // seedUser default role is "user"; login as them.
    const { loginApi } = await import("../api.js");
    const u = await seedUser({ email: `nonadmin-${Math.random().toString(36).slice(2)}@test.local` });
    const tokens = await loginApi(u.email, "secret123");
    const r = await authed(tokens.accessToken, "/api/v1/admin/dashboard");
    expect(r.status).toBe(403);
  });
});