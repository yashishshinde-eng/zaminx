import { User, ActivityLog, UserPackage } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";
import { getWalletBalances } from "./wallet.service.js";
import { getTeamCounts } from "./referral.service.js";
import type { DashboardSummary } from "@zaminex/shared";

/**
 * Assemble the user dashboard. Slices backed by later phases return zeros /
 * empty arrays today; `account`, `referral`, `package`, and `recentActivity`
 * are real.
 */
export async function getDashboardSummary(userId: string): Promise<DashboardSummary> {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound("User not found");

  // Real: recent activity from the audit log (most recent first, capped at 8).
  const logs = await ActivityLog.find({ actor: userId })
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
  const [activePkg, pendingCount, historyCount, wallets, team] = await Promise.all([
    UserPackage.findOne({ user: userId, status: "active" }).sort({ activatedAt: -1 }).lean(),
    UserPackage.countDocuments({ user: userId, status: "pending" }),
    UserPackage.countDocuments({ user: userId }),
    getWalletBalances(userId),
    getTeamCounts(userId),
  ]);

  return {
    account: {
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      status: user.status,
      memberSince: user.createdAt instanceof Date ? user.createdAt.toISOString() : new Date().toISOString(),
      // Static placeholder — the rank ladder is computed in Phase 10.
      rank: { name: "Starter", nextRank: "Bronze", progress: 0 },
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
    // Phase 10 (Compensation) fills these in.
    income: {
      trading: 0,
      direct: 0,
      team: 0,
      community: 0,
      rankReward: 0,
      bonanza: 0,
      total: 0,
      series: [],
    },
    // Phase 12 (Notifications) fills this in.
    notifications: { unread: 0, items: [] },
    recentActivity,
  };
}