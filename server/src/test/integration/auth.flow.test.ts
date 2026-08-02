import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { api, authed, closeApi, registerAndLogin } from "../api.js";
import { hasTestDb, connectTestDb, clearDb, disconnectTestDb } from "../db.js";

/**
 * Phase 20 — auth lifecycle integration test. Runs against the test Mongo
 * (skipped when no DB is reachable). Exercises register → login → me → refresh
 * → logout → refresh-after-logout(401), plus 401/400 negative cases.
 */
describe.skipIf(!hasTestDb)("auth flow", () => {
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

  it("register → login → me → refresh → logout → refresh fails 401", async () => {
    const email = `ada-${Math.random().toString(36).slice(2)}@test.local`;
    const password = "secret123";

    const reg = await api("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "Ada", email, password }),
    });
    expect(reg.status).toBe(201);
    expect(reg.body.success).toBe(true);
    const regTokens = reg.body.data.tokens;
    expect(regTokens.accessToken).toBeTruthy();

    const li = await api("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    expect(li.status).toBe(200);
    const { accessToken, refreshToken } = li.body.data.tokens;
    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();

    const me = await authed(accessToken, "/api/v1/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe(email);

    const rf = await api("/api/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
    expect(rf.status).toBe(200);
    expect(rf.body.data.tokens.accessToken).toBeTruthy();

    const lo = await api("/api/v1/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
    expect(lo.status).toBe(200);

    // After logout the refresh token is invalidated → refreshing again must 401.
    const rf2 = await api("/api/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
    expect(rf2.status).toBe(401);
  });

  it("rejects /me with no token (401)", async () => {
    const r = await api("/api/v1/auth/me");
    expect(r.status).toBe(401);
  });

  it("rejects login with a bad email (400 validation)", async () => {
    const r = await api("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "not-an-email", password: "secret123" }),
    });
    expect(r.status).toBe(400);
    expect(r.body.success).toBe(false);
  });

  it("registerAndLogin helper yields working tokens", async () => {
    const { accessToken } = await registerAndLogin();
    const me = await authed(accessToken, "/api/v1/auth/me");
    expect(me.status).toBe(200);
  });
});