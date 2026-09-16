import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { authed, closeApi, seedAdminAndLogin, registerAndLogin, seedPackage, fundWallet } from "../api.js";
import { hasTestDb, connectTestDb, clearDb, disconnectTestDb } from "../db.js";
import { User, UserPackage, WalletTransaction } from "../../models/index.js";

/**
 * Daily Team Energy Bonus — star-qualified model integration test. Exercises
 * the admin trigger over HTTP against the test DB: sequential per-level
 * qualification (3^N active members at level N), one idempotent credit per
 * user per earning day, full spec meta fields, star persistence and the
 * dashboard `teamEnergy` slice.
 */
describe.skipIf(!hasTestDb)("team energy flow", () => {
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

  const DATE = "2024-01-15";
  const referralCodeOf = async (token: string): Promise<string> => {
    const me = await authed<{ data: { user: { referralCode: string } } }>(token, "/api/v1/auth/me");
    return me.body.data.user.referralCode;
  };
  const activateFor = async (token: string, packageId: string, userId: string, price = 50): Promise<void> => {
    await fundWallet(price, token);
    await authed(token, "/api/v1/packages/activate", {
      method: "POST",
      body: JSON.stringify({ packageId }),
    });
    await UserPackage.updateOne(
      { user: userId, status: "active" },
      { $set: { activatedAt: new Date("2024-01-01T00:00:00Z"), expiresAt: null } },
    );
  };

  it("pays star-1 users 10% of their level-1 downline yield, once per day", async () => {
    const admin = await seedAdminAndLogin();
    // A holds an active package (anti-farming guard) with 3 active directs.
    const A = await registerAndLogin({ name: "Alpha" });
    const pkg = await seedPackage({ priceUsd: 50, dailyReturnPct: 1, durationDays: 0 });
    await activateFor(A.accessToken, pkg._id, A.userId);
    const aCode = await referralCodeOf(A.accessToken);
    for (let i = 1; i <= 3; i++) {
      const direct = await registerAndLogin({ name: `D${i}`, referralCode: aCode });
      await activateFor(direct.accessToken, pkg._id, direct.userId);
    }

    const r = await authed(admin.accessToken, `/api/v1/compensation/run-team-energy?date=${DATE}`, { method: "POST" });
    expect(r.status).toBe(200);
    expect(r.body.data.teamEnergy.credited).toBe(1);

    const txns = await WalletTransaction.find({ type: "team_bonus", "meta.date": DATE }).lean();
    expect(txns.length).toBe(1);
    const t = txns[0];
    expect(t.user.toString()).toBe(A.userId);
    expect(t.meta).toMatchObject({
      bonusType: "DAILY_TEAM_ENERGY",
      starLevel: 1,
      starPosition: 1,
      teamMemberCount: 3,
      bonusPercentage: 10,
      status: "completed",
      earningDate: DATE,
    });
    // Bonus = base × 10%, cents-exact.
    expect(t.amount).toBeCloseTo(t.meta.eligibleBonusBase * 0.1, 2);
    expect(t.meta.eligibleBonusBase).toBeGreaterThan(0);
    expect(t.reference?.resourceId).toBe(`team-energy:${A.userId}:${DATE}`);

    // Star persisted on the user (read model).
    const a = await User.findById(A.userId).select("teamEnergyStar").lean();
    expect((a as { teamEnergyStar?: number } | null)?.teamEnergyStar).toBe(1);

    // Wallet credited exactly once — the bonus wallet's available balance must
    // equal the sum of its ledger credits (it also holds the directs' direct
    // bonuses, so it is asserted against the ledger, not against t.amount).
    const w = await authed<{ data: { wallets: { bonus: { available: number } } } }>(A.accessToken, "/api/v1/wallet");
    const creditSum = (
      await WalletTransaction.find({ user: A.userId, wallet: "bonus", direction: "credit" }).select("amount").lean()
    ).reduce((s, c) => s + c.amount, 0);
    expect(w.body.data.wallets.bonus.available).toBeCloseTo(creditSum, 8);

    // Idempotent: re-running the same date credits nothing new.
    const r2 = await authed(admin.accessToken, `/api/v1/compensation/run-team-energy?date=${DATE}`, { method: "POST" });
    expect(r2.status).toBe(200);
    expect(r2.body.data.teamEnergy.credited).toBe(0);
    const again = await WalletTransaction.find({ type: "team_bonus", "meta.date": DATE }).lean();
    expect(again.length).toBe(1);
  }, 120_000);

  it("pays a 2-star per-level rates: L1 at 10% AND L2 at 5%", async () => {
    const admin = await seedAdminAndLogin();
    // A holds an active package; 3 active directs (L1) + 3 packaged actives
    // under each direct (9 at L2) → sequential 2★.
    const A = await registerAndLogin({ name: "Beta" });
    const pkg = await seedPackage({ priceUsd: 50, dailyReturnPct: 1, durationDays: 0 });
    await activateFor(A.accessToken, pkg._id, A.userId);
    const aCode = await referralCodeOf(A.accessToken);
    for (let i = 1; i <= 3; i++) {
      const direct = await registerAndLogin({ name: `BD${i}`, referralCode: aCode });
      await activateFor(direct.accessToken, pkg._id, direct.userId);
      const dCode = await referralCodeOf(direct.accessToken);
      for (let j = 1; j <= 3; j++) {
        const sub = await registerAndLogin({ name: `BS${i}-${j}`, referralCode: dCode });
        await activateFor(sub.accessToken, pkg._id, sub.userId);
      }
    }

    const r = await authed(admin.accessToken, `/api/v1/compensation/run-team-energy?date=${DATE}`, { method: "POST" });
    expect(r.status).toBe(200);

    const t = (await WalletTransaction.findOne({ user: A.userId, type: "team_bonus", "meta.date": DATE }).lean())!;
    expect(t.meta).toMatchObject({ bonusType: "DAILY_TEAM_ENERGY", starLevel: 2, bonusPercentage: 5 });

    // Per-level meta: level 1 at its own 10% rate, level 2 at its own 5% —
    // the credited amount is the SUM, not the star rate split proportionally
    // (the legacy model would pay 5% of the whole base: 0.6y vs 0.75y here).
    const perLevel = t.meta.perLevel as { level: number; base: number; ratePct: number; bonus: number }[];
    const l1 = perLevel.find((p) => p.level === 1)!;
    const l2 = perLevel.find((p) => p.level === 2)!;
    expect(l1.ratePct).toBe(10);
    expect(l2.ratePct).toBe(5);
    expect(l1.bonus).toBeCloseTo(l1.base * 0.1, 2);
    expect(l2.bonus).toBeCloseTo(l2.base * 0.05, 2);
    expect(t.amount).toBeCloseTo(l1.bonus + l2.bonus, 2);
    expect(t.meta.eligibleBonusBase).toBeCloseTo(l1.base + l2.base, 2);

    // Report drill-down: each source shows its level's exact rate — an L1
    // contributor earns double an L2 contributor (equal packages/yields).
    // Per-source nearest-cent rounding may drift ±0.01, so compare with that
    // slack instead of exact ratios.
    const sources = t.meta.sources as { level: number; amount: number }[];
    const l1src = sources.filter((s) => s.level === 1);
    const l2src = sources.filter((s) => s.level === 2);
    expect(l1src.length).toBe(3);
    expect(l2src.length).toBe(9);
    const y = l2.base / 9; // identical packages → identical per-member yield
    expect(Math.abs(l1src[0].amount - y * 0.1)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(l2src[0].amount - y * 0.05)).toBeLessThanOrEqual(0.01);
  }, 180_000);

  it("is sequential: 100 deep actives cannot bypass 2 active directs (< 3)", async () => {
    const admin = await seedAdminAndLogin();
    const S = await registerAndLogin({ name: "Sigma" });
    const pkg = await seedPackage({ priceUsd: 50, dailyReturnPct: 1, durationDays: 0 });
    await activateFor(S.accessToken, pkg._id, S.userId);
    const sOid = S.userId;

    // 2 active directs (one short of the 1★ requirement), each backed by a
    // package-bearing chain so level-2 counts exceed the 2★ requirement.
    const sCode = await referralCodeOf(S.accessToken);
    const directIds: string[] = [];
    for (let i = 1; i <= 2; i++) {
      const d = await registerAndLogin({ name: `SD${i}`, referralCode: sCode });
      await activateFor(d.accessToken, pkg._id, d.userId);
      directIds.push(d.userId);
    }
    // 9 active members at level 2 under the first direct (≥ 9 = 3^2).
    const d1 = await User.findById(directIds[0]).select("lineage").lean();
    for (let i = 1; i <= 9; i++) {
      await User.create({
        name: `Deep${i}`,
        email: `deep-${i}-${Date.now()}@test.local`,
        password: "secret123",
        transactionPassword: "1234",
        referralCode: `DEEP${Math.random().toString(36).slice(2, 8)}`,
        sponsorId: d1!._id,
        lineage: [...(d1!.lineage ?? []), d1!._id],
        status: "active",
      });
    }

    const r = await authed(admin.accessToken, `/api/v1/compensation/run-team-energy?date=${DATE}`, { method: "POST" });
    expect(r.status).toBe(200);
    expect(r.body.data.teamEnergy.credited).toBe(0);

    const s = await User.findById(sOid).select("teamEnergyStar").lean();
    expect((s as { teamEnergyStar?: number } | null)?.teamEnergyStar).toBe(0);
    expect(await WalletTransaction.countDocuments({ type: "team_bonus", "meta.date": DATE })).toBe(0);
  }, 120_000);

  it("exposes the teamEnergy slice on GET /dashboard/summary", async () => {
    const admin = await seedAdminAndLogin();
    const A = await registerAndLogin({ name: "Alpha2" });
    const pkg = await seedPackage({ priceUsd: 50, dailyReturnPct: 1, durationDays: 0 });
    await activateFor(A.accessToken, pkg._id, A.userId);
    const aCode = await referralCodeOf(A.accessToken);
    for (let i = 1; i <= 3; i++) {
      const direct = await registerAndLogin({ name: `E${i}`, referralCode: aCode });
      await activateFor(direct.accessToken, pkg._id, direct.userId);
    }
    await authed(admin.accessToken, `/api/v1/compensation/run-team-energy?date=${DATE}`, { method: "POST" });

    const r = await authed<{ data: { teamEnergy: {
      starLevel: number; starPosition: number; bonusPercentage: number; teamMemberCount: number;
      perLevel: { level: number; activeCount: number; required: number; qualified: boolean }[];
      nextStar: { level: number; required: number; current: number; gap: number } | null;
      totalBonus: number; todayBonus: number;
    } } }>(A.accessToken, "/api/v1/dashboard/summary");
    expect(r.status).toBe(200);
    const te = r.body.data.teamEnergy;
    expect(te.starLevel).toBe(1);
    expect(te.starPosition).toBe(1);
    expect(te.bonusPercentage).toBe(10);
    expect(te.teamMemberCount).toBe(3);
    expect(te.perLevel[0]).toMatchObject({ level: 1, activeCount: 3, required: 3, qualified: true });
    expect(te.nextStar).toMatchObject({ level: 2, required: 9, current: 0, gap: 9 });
    expect(te.totalBonus).toBeGreaterThan(0);
    // The payout was backdated — today's (real-day) slice stays 0.
    expect(te.todayBonus).toBe(0);
  }, 120_000);
});