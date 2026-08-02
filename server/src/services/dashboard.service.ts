import { User, ActivityLog } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";
import type { DashboardSummary } from "@zaminex/shared";

/**
 * Assemble the user dashboard. Slices backed by later phases return zeros /
 * empty arrays today; `account`, `referral`, and `recentActivity` are real.
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
    // Phase 8 (Wallet) fills these in.
    wallets: { main: 0, bonus: 0, trading: 0, total: 0 },
    // Phase 6 (Package) fills this in.
    package: { active: false, name: null, activatedAt: null, historyCount: 0 },
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