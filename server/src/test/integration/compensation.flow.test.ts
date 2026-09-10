import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { authed, closeApi, seedAdminAndLogin, registerAndLogin, seedPackage, fundWallet } from "../api.js";
import { hasTestDb, connectTestDb, clearDb, disconnectTestDb } from "../db.js";
import { UserPackage, Rank, WalletTransaction } from "../../models/index.js";

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

  it(
    "pays a lifetime package exactly 30% of its price across a full month (flexible 0.5–1% daily)",
    async () => {
    const admin = await seedAdminAndLogin();
    const { accessToken, userId } = await registerAndLogin();
    // $50 package; the flexible schedule must land the month on 30% = $15.
    const pkg = await seedPackage({ priceUsd: 50, dailyReturnPct: 1, durationDays: 0 });
    // Fund the wallet, then activate the package from the balance (instant).
    await fundWallet(50, accessToken);
    await authed(accessToken, "/api/v1/packages/activate", {
      method: "POST",
      body: JSON.stringify({ packageId: pkg._id }),
    });

    // Backdate activation so the package is eligible across the whole target month.
    await UserPackage.updateOne(
      { user: userId, status: "active" },
      { $set: { activatedAt: new Date("2024-01-01T00:00:00Z"), expiresAt: null } },
    );

    // Run yield for every day of Jan 2024 (31 days) — the month must total $15.
    for (let d = 1; d <= 31; d++) {
      const date = `2024-01-${String(d).padStart(2, "0")}`;
      await authed(admin.accessToken, `/api/v1/compensation/run-yield?date=${date}`, { method: "POST" });
    }

    const w = await authed<{ data: { wallets: { trading: { available: number } } } }>(accessToken, "/api/v1/wallet");
    expect(w.body.data.wallets.trading.available).toBeCloseTo(15, 8);

    // Every daily credit stays inside the schedule's bounds (0.5%–2% of price):
    // the band floor on weak days, the catch-up cap on recovery days.
    const txns = await WalletTransaction.find({ type: "trading_yield", "meta.userPackageId": { $exists: true } })
      .select("amount")
      .lean();
    expect(txns.length).toBe(31);
    for (const t of txns) {
      expect(t.amount).toBeGreaterThanOrEqual(0.25); // 0.5% of $50
      expect(t.amount).toBeLessThanOrEqual(1); // 2% of $50 (catch-up cap)
    }
  }, 120_000);

  it("pro-rates a package activated mid-month to its eligible share of 30%", async () => {
    const admin = await seedAdminAndLogin();
    const { accessToken, userId } = await registerAndLogin();
    const pkg = await seedPackage({ priceUsd: 50, dailyReturnPct: 1, durationDays: 0 });
    await fundWallet(50, accessToken);
    await authed(accessToken, "/api/v1/packages/activate", {
      method: "POST",
      body: JSON.stringify({ packageId: pkg._id }),
    });

    // Activated on Jan 21 → 11 eligible days of Jan (21st–31st) →
    // pro-rata target = 30% × 11/31 of $50 = $5.32.
    await UserPackage.updateOne(
      { user: userId, status: "active" },
      { $set: { activatedAt: new Date("2024-01-21T00:00:00Z"), expiresAt: null } },
    );

    for (let d = 21; d <= 31; d++) {
      const date = `2024-01-${String(d).padStart(2, "0")}`;
      await authed(admin.accessToken, `/api/v1/compensation/run-yield?date=${date}`, { method: "POST" });
    }

    const w = await authed<{ data: { wallets: { trading: { available: number } } } }>(accessToken, "/api/v1/wallet");
    expect(w.body.data.wallets.trading.available).toBeCloseTo(5.32, 8);
  }, 120_000);

  it("pays the monthly community bonus to a sponsor with an active direct (idempotent)", async () => {
    const admin = await seedAdminAndLogin();
    const sponsor = await registerAndLogin({ name: "Sponsor" });
    const me = await authed<{ data: { user: { referralCode: string } } }>(sponsor.accessToken, "/api/v1/auth/me");
    const referralCode = me.body.data.user.referralCode;

    // Ranks now qualify on ACTIVE directs only (1 Star = 1 active direct), and
    // the community run pays by the sticky `highestStar` on the same ladder.
    // Zero the direct-connect bonus first so the sponsor's bonus wallet holds
    // only the rank reward + community bonus this test accounts for.
    await authed(admin.accessToken, "/api/v1/admin/settings/compensation", {
      method: "PATCH",
      body: JSON.stringify({ directBonusPct: 0 }),
    });

    // Star-1 rung: 1 active direct, reward $10 (one-time rank reward AND the
    // monthly community amount come from this same ladder entry).
    await Rank.create({
      name: "1 Star",
      order: 1,
      requiredDirects: 1,
      requiredTeamSize: 0,
      rewardAmount: 10,
      status: "active",
    });

    // Sponsor must hold an active package (anti-farming guard).
    const pkg = await seedPackage({ priceUsd: 50, dailyReturnPct: 1, durationDays: 0 });
    await fundWallet(50, sponsor.accessToken);
    await authed(sponsor.accessToken, "/api/v1/packages/activate", {
      method: "POST",
      body: JSON.stringify({ packageId: pkg._id }),
    });

    // One ACTIVE direct: register a downline under the sponsor and activate a
    // package for them. Activation fires the sponsor's rank eval → one-time
    // rank reward ($10) + sticky highestStar = 1.
    const direct = await registerAndLogin({ name: "Active direct", referralCode });
    await fundWallet(50, direct.accessToken);
    await authed(direct.accessToken, "/api/v1/packages/activate", {
      method: "POST",
      body: JSON.stringify({ packageId: pkg._id }),
    });

    const r = await authed(admin.accessToken, "/api/v1/compensation/run-community?month=2024-01", { method: "POST" });
    expect(r.status).toBe(200);

    // Bonus wallet = $10 one-time rank reward + $10 star-1 community bonus.
    const w = await authed<{ data: { wallets: { bonus: { available: number } } } }>(sponsor.accessToken, "/api/v1/wallet");
    expect(w.body.data.wallets.bonus.available).toBeCloseTo(20, 8);

    // Idempotent: re-running the same month does not double-credit.
    await authed(admin.accessToken, "/api/v1/compensation/run-community?month=2024-01", { method: "POST" });
    const w2 = await authed<{ data: { wallets: { bonus: { available: number } } } }>(sponsor.accessToken, "/api/v1/wallet");
    expect(w2.body.data.wallets.bonus.available).toBeCloseTo(20, 8);
  });
});