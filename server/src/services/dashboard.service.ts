import mongoose from "mongoose";
import { User, ActivityLog, UserPackage, WalletTransaction } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";
import { getWalletBalances } from "./wallet.service.js";
import { getTeamCounts } from "./referral.service.js";
import { getRankInfo } from "./rank.service.js";
import type { DashboardSummary, IncomeSummary, WalletTxType } from "@zeminex/shared";

const DAY_MS = 86_400_000;

/** Compensation ledger types that flow into the six dashboard income streams. */
const INCOME_TYPES: WalletTxType[] = [
  "trading_yield",
  "direct_bonus",
  "team_bonus",
  "community_bonus",
  "rank_reward",
  "bonanza",
];

/** Map a ledger type onto the dashboard income stream key. */
const STREAM_BY_TYPE: Record<string, keyof IncomeSummary> = {
  trading_yield: "trading",
  direct_bonus: "direct",
  team_bonus: "team",
  community_bonus: "community",
  rank_reward: "rankReward",
  bonanza: "bonanza",
};

/**
 * Real income aggregation (Phases 10 & 10A): per-stream credit totals from the
 * immutable ledger, plus a 30-day daily-totals series for the area chart. All
 * six streams are now populated by the compensation engine.
 */
async function getIncomeSummary(userId: string): Promise<IncomeSummary> {
  const since = new Date(Date.now() - 30 * DAY_MS);
  // Cast to ObjectId: the aggregation `$match` does not auto-cast a string to
  // the `user` ObjectId field (unlike `findOne`), so a plain string userId
  // would match nothing and every income stream would read as 0.
  const userOid = new mongoose.Types.ObjectId(userId);

  const [byType, daily] = await Promise.all([
    WalletTransaction.aggregate<{ _id: string; total: number }>([
      { $match: { user: userOid, direction: "credit", type: { $in: INCOME_TYPES } } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]),
    WalletTransaction.aggregate<{ _id: string; value: number }>([
      { $match: { user: userOid, direction: "credit", type: { $in: INCOME_TYPES }, createdAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          value: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const income: IncomeSummary = {
    trading: 0,
    direct: 0,
    team: 0,
    community: 0,
    rankReward: 0,
    bonanza: 0,
    total: 0,
    series: daily.map((d) => ({ date: d._id, value: d.value })),
  };

  let total = 0;
  for (const r of byType) {
    const key = STREAM_BY_TYPE[r._id];
    // Only the six numeric stream keys are settable here (exclude `total`/`series`).
    if (key && key !== "total" && key !== "series") {
      income[key] = r.total;
      total += r.total;
    }
  }
  income.total = total;
  return income;
}

/**
 * Assemble the user dashboard. Slices backed by later phases return zeros /
 * empty arrays today; `account`, `referral`, `package`, and `recentActivity`
 * are real.
 */
export async function getDashboardSummary(userId: string): Promise<DashboardSummary> {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound("User not found");

  // Real: recent activity from the audit log (most recent first, capped at 8).
  // Exclude `auth.login` — routine sign-ins clutter the list and aren't
  // "transactions" the user cares to see on their dashboard.
  const logs = await ActivityLog.find({ actor: userId, action: { $ne: "auth.login" } })
    .sort({ createdAt: -1 })
    .limit(8)
    .lean();
  const recentActivity = logs.map((l) => ({
    id: l._id.toString(),
    action: l.action,
    createdAt: l.createdAt.toISOString(),
  }));

  // Real (Phase 6): the user's active package, pending count, and history total.
  // Real (Phase 8): the user's wallet balances (Main / Bonus / Trading + totals).
  // Real (Phase 9): the user's referral team counts (direct + all-level).
  const [activePkg, pendingCount, historyCount, wallets, team, income] = await Promise.all([
    UserPackage.findOne({ user: userId, status: "active" }).sort({ activatedAt: -1 }).lean(),
    UserPackage.countDocuments({ user: userId, status: "pending" }),
    UserPackage.countDocuments({ user: userId }),
    getWalletBalances(userId),
    getTeamCounts(userId),
    getIncomeSummary(userId),
  ]);

  // Phase 10A: real rank slice from the active ladder, reusing the `team`
  // counts already fetched above (avoids two extra countDocuments calls).
  const rank = await getRankInfo(userId, team);

  return {
    account: {
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      status: user.status,
      memberSince: user.createdAt instanceof Date ? user.createdAt.toISOString() : new Date().toISOString(),
      rank,
    },
    referral: {
      code: user.referralCode,
      link: `${env.CLIENT_URL}/?ref=${user.referralCode}`,
    },
    // Phase 9 (Referral) — real direct + team (all-level) counts.
    team,
    // Phase 8 (Wallet) — real Main/Bonus/Trading balances + totals.
    wallets,
    // Phase 6 (Package) — real active package + pending/history counts.
    package: {
      active: !!activePkg,
      name: activePkg?.snapshot?.name ?? null,
      activatedAt: activePkg?.activatedAt instanceof Date ? activePkg.activatedAt.toISOString() : null,
      historyCount,
      pending: pendingCount,
    },
    // Phase 10 (Compensation) — real per-stream totals + 30-day series.
    income,
    // Phase 12 (Notifications) fills this in.
    notifications: { unread: 0, items: [] },
    recentActivity,
  };
}