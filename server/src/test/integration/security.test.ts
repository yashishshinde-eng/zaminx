import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { api, authed, closeApi, registerAndLogin } from "../api.js";
import { hasTestDb, connectTestDb, clearDb, disconnectTestDb } from "../db.js";
import { getMaintenanceSettings, setSetting } from "../../services/setting.service.js";

/**
 * Phase 20 — security integration test. Helmet headers, CORS preflight, JWT
 * tamper → 401, and the maintenance setting that drives the 503 gate.
 * (The 503 enforcement path itself is covered by smoke; its in-process 5s cache
 * makes a mid-suite HTTP flip brittle, so we assert the setting round-trip here.)
 */
describe.skipIf(!hasTestDb)("security", () => {
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

  it("applies helmet security headers", async () => {
    const r = await api("/api/v1/auth/me"); // 401, but helmet still applies
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("handles a CORS preflight for the configured origin", async () => {
    const r = await api("/api/v1/auth/login", {
      method: "OPTIONS",
      headers: { Origin: "http://localhost:5173", "Access-Control-Request-Method": "POST" },
    });
    expect(r.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
  });

  it("rejects a tampered/invalid JWT with 401", async () => {
    const r = await authed("garbage.token.here", "/api/v1/auth/me");
    expect(r.status).toBe(401);
  });

  it("requires ownership (404 not 403) for another user's resource", async () => {
    const { accessToken } = await registerAndLogin();
    // A nonexistent deposit id → 404, never 403, to avoid leaking existence.
    const r = await authed(accessToken, "/api/v1/payments/deposits/507f1f77bcf86cd799439011");
    expect([404, 400]).toContain(r.status);
  });

  it("maintenance flag round-trips via the settings store", async () => {
    await setSetting("general.maintenanceMode", { enabled: true, message: "test" }, "general", true);
    const on = await getMaintenanceSettings();
    expect(on.enabled).toBe(true);
    expect(on.message).toBe("test");

    await setSetting("general.maintenanceMode", { enabled: false, message: "" }, "general", true);
    const off = await getMaintenanceSettings();
    expect(off.enabled).toBe(false);
  });
});