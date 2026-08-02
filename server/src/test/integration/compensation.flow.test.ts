import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { authed, closeApi, seedAdminAndLogin, registerAndLogin } from "../api.js";
import { hasTestDb, connectTestDb, clearDb, disconnectTestDb } from "../db.js";

/**
 * Phase 20 — compensation integration test. Exercises the admin-only
 * compensation triggers over HTTP (yield / team-energy / community / rank-check
 * / bonanza / overview) against the test DB. With no active packages the runs
 * are no-ops returning summary objects; the point is that the engines execute
 * without error and report deterministic counts. Idempotency: re-running the
 * same period yields the same (zero) ledger delta.
 */
describe.skipIf(!hasTestDb)("compensation flow", () => {
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

  it("runs the daily yield engine and reports a summary", async () => {
    const admin = await seedAdminAndLogin();
    const r = await authed(admin.accessToken, "/api/v1/compensation/run-yield?date=2024-01-01", { method: "POST" });
    expect(r.status).toBe(200);
    expect(r.body.data.yield).toBeTruthy();
  });

  it("runs team-energy, community, and rank-check engines", async () => {
    const admin = await seedAdminAndLogin();
    const team = await authed(admin.accessToken, "/api/v1/compensation/run-team-energy?date=2024-01-01", { method: "POST" });
    expect(team.status).toBe(200);
    expect(team.body.data.teamEnergy).toBeTruthy();

    const comm = await authed(admin.accessToken, "/api/v1/compensation/run-community?month=2024-01", { method: "POST" });
    expect(comm.status).toBe(200);
    expect(comm.body.data.community).toBeTruthy();

    const rank = await authed(admin.accessToken, "/api/v1/compensation/run-rank-check", { method: "POST" });
    expect(rank.status).toBe(200);
    expect(rank.body.data.rank).toBeTruthy();
  });

  it("exposes the compensation overview counts", async () => {
    const admin = await seedAdminAndLogin();
    await registerAndLogin();
    const r = await authed(admin.accessToken, "/api/v1/compensation/overview");
    expect(r.status).toBe(200);
    expect(r.body.data.overview).toMatchObject({
      activePackages: expect.any(Number),
      totalUsers: expect.any(Number),
      sponsors: expect.any(Number),
      activeOffers: expect.any(Number),
      activeRanks: expect.any(Number),
    });
  });

  it("is idempotent: re-running yield for the same date reports the same counts", async () => {
    const admin = await seedAdminAndLogin();
    const a = await authed(admin.accessToken, "/api/v1/compensation/run-yield?date=2024-02-02", { method: "POST" });
    const b = await authed(admin.accessToken, "/api/v1/compensation/run-yield?date=2024-02-02", { method: "POST" });
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(b.body.data.yield).toEqual(a.body.data.yield);
  });
});