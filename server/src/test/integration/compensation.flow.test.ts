import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { api, authed, closeApi, seedAdminAndLogin, registerAndLogin, seedPackage } from "../api.js";
import { hasTestDb, connectTestDb, clearDb, disconnectTestDb } from "../db.js";
import { UserPackage, Rank } from "../../models/index.js";

/**
 * Phase 20 — compensation integration test. Exercises the admin-only
 * compensation triggers over HTTP (yield / team-energy / community / rank-check
 * / bonanza / overview) against the test DB, plus spec-aligned behavior:
 * lifetime-package daily yield capped at 30%/month, and the monthly community
 * bonus paid by star to a 3-member-team sponsor (idempotent).
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

  it("caps a lifetime package's monthly yield at 30% of the package price", async () => {
    const admin = await seedAdminAndLogin();
    const { accessToken, userId } = await registerAndLogin();
    // $50 package, 2% daily = $1/day; 30% monthly cap = $15.
    const pkg = await seedPackage({ priceUsd: 50, dailyReturnPct: 2, durationDays: 0 });
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

    // Backdate activation so the package is eligible across the whole target month.
    await UserPackage.updateOne(
      { user: userId, status: "active" },
      { $set: { activatedAt: new Date("2024-01-01T00:00:00Z"), expiresAt: null } },
    );

    // Run yield for 20 days of Jan 2024 — $1/day but capped at $15/month.
    for (let d = 1; d <= 20; d++) {
      const date = `2024-01-${String(d).padStart(2, "0")}`;
      await authed(admin.accessToken, `/api/v1/compensation/run-yield?date=${date}`, { method: "POST" });
    }

    const w = await authed<{ data: { wallets: { trading: { available: number } } } }>(accessToken, "/api/v1/wallet");
    expect(w.body.data.wallets.trading.available).toBe(15);
  });

  it("pays the monthly community bonus to a 3-member-team sponsor by star (idempotent)", async () => {
    const admin = await seedAdminAndLogin();
    const sponsor = await registerAndLogin({ name: "Sponsor" });
    const me = await authed<{ data: { user: { referralCode: string } } }>(sponsor.accessToken, "/api/v1/auth/me");
    const referralCode = me.body.data.user.referralCode;

    // Build a 3-member downline (team size 3 → star 1). The rank ladder is still
    // empty here, so registration-time rank evals credit nothing.
    for (let i = 0; i < 3; i++) {
      await api("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: `Downline ${i}`,
          email: `dl-${i}-${Math.random().toString(36).slice(2)}@test.local`,
          password: "secret123",
          referralCode,
        }),
      });
    }

    // Seed the star-1 rank (reward $10) before the community run. The community
    // run pays by `getStarFromTeamSize(teamCount)` (pure 3^n) — a 3-member team
    // is star 1 → $10. We set requiredTeamSize a hair above 3 so the sponsor's
    // 3-member team does NOT also trigger the one-time rank reward (same $10,
    // same wallet), isolating the community bonus deterministically.
    await Rank.create({
      name: "1 Star",
      order: 1,
      requiredDirects: 0,
      requiredTeamSize: 4,
      rewardAmount: 10,
      status: "active",
    });

    // Sponsor must hold an active package (anti-farming guard).
    const pkg = await seedPackage({ priceUsd: 50, dailyReturnPct: 2, durationDays: 0 });
    await authed(sponsor.accessToken, "/api/v1/packages/activate", {
      method: "POST",
      body: JSON.stringify({ packageId: pkg._id }),
    });
    const list = await authed<{ data: { deposits: { _id: string; status: string }[] } }>(
      sponsor.accessToken,
      "/api/v1/payments/deposits",
    );
    const id = list.body.data.deposits.find((d) => d.status === "pending")!._id;
    await authed(sponsor.accessToken, `/api/v1/payments/dev/simulate/${id}`, { method: "POST" });

    const r = await authed(admin.accessToken, "/api/v1/compensation/run-community?month=2024-01", { method: "POST" });
    expect(r.status).toBe(200);

    // Sponsor earns the star-1 community reward ($10) to the bonus wallet.
    const w = await authed<{ data: { wallets: { bonus: { available: number } } } }>(sponsor.accessToken, "/api/v1/wallet");
    expect(w.body.data.wallets.bonus.available).toBe(10);

    // Idempotent: re-running the same month does not double-credit.
    await authed(admin.accessToken, "/api/v1/compensation/run-community?month=2024-01", { method: "POST" });
    const w2 = await authed<{ data: { wallets: { bonus: { available: number } } } }>(sponsor.accessToken, "/api/v1/wallet");
    expect(w2.body.data.wallets.bonus.available).toBe(10);
  });
});