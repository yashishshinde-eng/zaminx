import mongoose from "mongoose";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { authed, closeApi, seedAdminAndLogin, registerAndLogin, seedPackage, fundWallet } from "../api.js";
import { hasTestDb, connectTestDb, clearDb, disconnectTestDb } from "../db.js";
import { User, UserPackage, WalletTransaction } from "../../models/index.js";

/**
 * Community Monthly Bonus integration test. Exercises the admin trigger over
 * HTTP against the test DB: fixed $ amount per sequentially qualified star
 * (the SHARED Star Qualification Engine — 3^N active members at level N),
 * one idempotent credit per user per distribution month, full spec meta
 * fields, the dashboard `communityBonus` slice and the admin payouts report.
 */
describe.skipIf(!hasTestDb)("community monthly bonus flow", () => {
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

  const MONTH = "2024-02";
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

  /** Create an ACTIVE member directly under `sponsor` (no package needed —
   *  qualification counts `User.status === "active"`). */
  const createActiveMember = async (
    name: string,
    sponsor: { _id: mongoose.Types.ObjectId; lineage?: mongoose.Types.ObjectId[] },
  ) =>
    User.create({
      name,
      email: `${name.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.local`,
      password: "secret123",
      transactionPassword: "1234",
      referralCode: `CB${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      sponsorId: sponsor._id,
      lineage: [...(sponsor.lineage ?? []), sponsor._id],
      status: "active",
    });

  /** Build the earner (active package via the real activation flow) plus
   *  `directCount` active directs and `deepCount` extra active members under
   *  the FIRST direct. Returns the earner's auth context. */
  const buildTeam = async (directCount: number, deepCount: number) => {
    const pkg = await seedPackage({ priceUsd: 50, dailyReturnPct: 1, durationDays: 0 });
    const A = await registerAndLogin({ name: "Earner" });
    await activateFor(A.accessToken, pkg._id, A.userId);
    const a = await User.findById(A.userId).select("lineage").lean();
    const aNode = { _id: new mongoose.Types.ObjectId(A.userId), lineage: (a!.lineage ?? []) as mongoose.Types.ObjectId[] };
    const directs: { _id: mongoose.Types.ObjectId; lineage: mongoose.Types.ObjectId[] }[] = [];
    for (let i = 1; i <= directCount; i++) {
      const d = (await createActiveMember(`D${i}`, aNode)) as { _id: mongoose.Types.ObjectId; lineage: mongoose.Types.ObjectId[] };
      directs.push(d);
    }
    for (let i = 1; i <= deepCount; i++) {
      await createActiveMember(`Deep${i}`, directs[0]);
    }
    return A;
  };

  const runCommunity = async (adminToken: string) =>
    authed<{ data: { community: { credited: number; skipped: number; errors: number } } }>(
      adminToken,
      `/api/v1/compensation/run-community?month=${MONTH}`,
      { method: "POST" },
    );

  const monthTxns = async () =>
    WalletTransaction.find({ type: "community_bonus", "meta.distributionMonth": MONTH }).lean();

  it("pays the fixed $10 to a 1★ user once per distribution month (idempotent)", async () => {
    const admin = await seedAdminAndLogin();
    const A = await buildTeam(3, 0); // 3 active directs → 1★

    const r = await runCommunity(admin.accessToken);
    expect(r.status).toBe(200);
    expect(r.body.data.community.credited).toBe(1);
    expect(r.body.data.community.errors).toBe(0);

    const txns = await monthTxns();
    expect(txns.length).toBe(1);
    const t = txns[0];
    expect(t.user.toString()).toBe(A.userId);
    expect(t.wallet).toBe("bonus");
    expect(t.amount).toBe(10); // fixed $ — not a percentage of anything
    expect(t.meta).toMatchObject({
      bonusType: "COMMUNITY_MONTHLY_BONUS",
      distributionMonth: MONTH,
      starLevel: 1,
      starPosition: 1,
      qualifyingTeamMembers: 3,
      requiredTeamMembers: 3,
      bonusAmount: 10,
      currency: "USDT",
      status: "completed",
      month: MONTH,
    });
    expect(t.reference?.resourceId).toBe(`community:${A.userId}:${MONTH}`);
    expect(t.memo).toContain("1 Star");

    // Wallet credited exactly once — bonus available must equal ledger credits.
    const w = await authed<{ data: { wallets: { bonus: { available: number } } } }>(A.accessToken, "/api/v1/wallet");
    const creditSum = (
      await WalletTransaction.find({ user: A.userId, wallet: "bonus", direction: "credit" }).select("amount").lean()
    ).reduce((s, c) => s + c.amount, 0);
    expect(w.body.data.wallets.bonus.available).toBeCloseTo(creditSum, 8);

    // Duplicate-payment protection: re-running the month pays nothing new.
    const r2 = await runCommunity(admin.accessToken);
    expect(r2.status).toBe(200);
    expect(r2.body.data.community.credited).toBe(0);
    expect(await monthTxns().then((rows) => rows.length)).toBe(1);

    // Admin payouts report (spec §12): month filter, row fields, total.
    const rep = await authed<{ data: { communityReport: {
      month: string; total: number; credited: number;
      rows: { userId: string; starLevel: number; bonusAmount: number; distributionMonth: string; status: string; paymentDate: string; userName: string }[];
    } } }>(admin.accessToken, `/api/v1/compensation/community-report?month=${MONTH}`);
    expect(rep.status).toBe(200);
    expect(rep.body.data.communityReport.month).toBe(MONTH);
    expect(rep.body.data.communityReport.credited).toBe(1);
    expect(rep.body.data.communityReport.total).toBe(10);
    expect(rep.body.data.communityReport.rows[0]).toMatchObject({
      userId: A.userId,
      starLevel: 1,
      bonusAmount: 10,
      distributionMonth: MONTH,
      status: "completed",
    });

    // User dashboard slice (GET /dashboard/community).
    const dash = await authed<{ data: {
      starLevel: number; monthlyBonus: number; qualifyingTeamMembers: number; requiredTeamMembers: number; totalBonus: number;
      nextStar: { level: number; required: number; current: number; gap: number } | null;
      history: { month: string; amount: number }[];
    } }>(A.accessToken, "/api/v1/dashboard/community");
    expect(dash.status).toBe(200);
    expect(dash.body.data.starLevel).toBe(1);
    expect(dash.body.data.monthlyBonus).toBe(10);
    expect(dash.body.data.qualifyingTeamMembers).toBe(3);
    expect(dash.body.data.requiredTeamMembers).toBe(3);
    expect(dash.body.data.totalBonus).toBe(10);
    expect(dash.body.data.nextStar).toMatchObject({ level: 2, required: 9, gap: 9 });
    expect(dash.body.data.history).toHaveLength(1);
    expect(dash.body.data.history[0]).toMatchObject({ month: MONTH, amount: 10 });
  }, 120_000);

  it("spec §2/§14: 2 active directs + 9 at level 2 → NO star, no payout", async () => {
    const admin = await seedAdminAndLogin();
    const A = await buildTeam(2, 9); // level 1 short of 3; deep actives can never bypass
    void A;

    const r = await runCommunity(admin.accessToken);
    expect(r.status).toBe(200);
    expect(r.body.data.community.credited).toBe(0);
    expect(await monthTxns()).toHaveLength(0);
  }, 120_000);

  it("spec §3/§14: 1★ passed, level 2 short (6 < 9) → $10 (1★), NOT $20", async () => {
    const admin = await seedAdminAndLogin();
    const A = await buildTeam(3, 6);
    void A;

    const r = await runCommunity(admin.accessToken);
    expect(r.status).toBe(200);
    expect(r.body.data.community.credited).toBe(1);

    const txns = await monthTxns();
    expect(txns.length).toBe(1);
    expect(txns[0].amount).toBe(10);
    expect(txns[0].meta).toMatchObject({ starLevel: 1, starPosition: 1, qualifyingTeamMembers: 3 });
  }, 120_000);

  it("2★ pays the fixed $20 with the level-2 qualification recorded", async () => {
    const admin = await seedAdminAndLogin();
    await buildTeam(3, 9); // 3 at L1 + 9 at L2 → 2★

    const r = await runCommunity(admin.accessToken);
    expect(r.status).toBe(200);
    expect(r.body.data.community.credited).toBe(1);

    const txns = await monthTxns();
    expect(txns.length).toBe(1);
    expect(txns[0].amount).toBe(20);
    expect(txns[0].meta).toMatchObject({
      bonusType: "COMMUNITY_MONTHLY_BONUS",
      starLevel: 2,
      starPosition: 2,
      qualifyingTeamMembers: 9,
      requiredTeamMembers: 9,
      bonusAmount: 20,
    });
  }, 120_000);

  it("dashboard summary exposes the communityBonus slice", async () => {
    const admin = await seedAdminAndLogin();
    const A = await buildTeam(3, 0);
    await runCommunity(admin.accessToken);

    const r = await authed<{ data: { communityBonus: {
      starLevel: number; monthlyBonus: number; qualifyingTeamMembers: number; requiredTeamMembers: number;
      perLevel: { level: number; activeCount: number; required: number; qualified: boolean }[];
      nextStar: { level: number; required: number; gap: number } | null;
      totalBonus: number; history: { month: string; amount: number }[];
    } } }>(A.accessToken, "/api/v1/dashboard/summary");
    expect(r.status).toBe(200);
    const cb = r.body.data.communityBonus;
    expect(cb.starLevel).toBe(1);
    expect(cb.monthlyBonus).toBe(10);
    expect(cb.qualifyingTeamMembers).toBe(3);
    expect(cb.requiredTeamMembers).toBe(3);
    expect(cb.perLevel[0]).toMatchObject({ level: 1, activeCount: 3, required: 3, qualified: true });
    expect(cb.nextStar).toMatchObject({ level: 2, required: 9, gap: 9 });
    expect(cb.totalBonus).toBe(10);
    expect(cb.history).toHaveLength(1);
  }, 120_000);
});