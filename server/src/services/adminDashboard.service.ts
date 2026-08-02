import { User, Deposit, Withdrawal, Wallet, UserPackage, ActivityLog } from "../models/index.js";
import type {
  AdminDashboardSummary,
  AdminDashboardKpis,
  AdminUsersByStatus,
  AdminWithdrawalTotals,
  AdminDashboardSeriesPoint,
  AdminDashboardActivityRow,
  WithdrawalStatus,
} from "@zaminex/shared";

const DAY_MS = 86_400_000;

const WITHDRAWAL_STATUSES: WithdrawalStatus[] = [
  "pending",
  "under_review",
  "approved",
  "paid",
  "rejected",
  "cancelled",
];

/**
 * Platform-wide admin dashboard (Phase 14A). Headline KPIs (users, deposit +
 * withdrawal volume, AUM, active packages, sponsors), a 30-day daily
 * deposits-vs-withdrawals series, and the 10 most recent audit-log entries.
 * Admin is authorised to see this PII.
 */
export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const since = new Date(Date.now() - 30 * DAY_MS);

  const [
    totalUsers,
    byStatusAgg,
    depositAgg,
    withdrawalByStatusAgg,
    withdrawalPaidAgg,
    aumAgg,
    activePackages,
    sponsors,
    depositSeriesAgg,
    withdrawalSeriesAgg,
    recentLogs,
  ] = await Promise.all([
    User.countDocuments({}),
    User.aggregate<{ _id: string | null; count: number }>([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    // Paid deposit volume (completed deposits = real inbound funds).
    Deposit.aggregate<{ _id: null; count: number; sum: number }>([
      { $match: { status: "paid" } },
      { $group: { _id: null, count: { $sum: 1 }, sum: { $sum: "$amountUsd" } } },
    ]),
    // Withdrawal counts broken down by status (the full pipeline).
    Withdrawal.aggregate<{ _id: string | null; count: number }>([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    // Paid withdrawal volume (completed = real outbound funds).
    Withdrawal.aggregate<{ _id: null; count: number; sum: number }>([
      { $match: { status: "paid" } },
      { $group: { _id: null, count: { $sum: 1 }, sum: { $sum: "$amount" } } },
    ]),
    // AUM = total platform liabilities across all wallets (available + onHold).
    Wallet.aggregate<{ _id: null; aum: number }>([
      {
        $group: {
          _id: null,
          aum: {
            $sum: {
              $add: [
                { $ifNull: ["$balances.main.available", 0] },
                { $ifNull: ["$balances.main.onHold", 0] },
                { $ifNull: ["$balances.bonus.available", 0] },
                { $ifNull: ["$balances.bonus.onHold", 0] },
                { $ifNull: ["$balances.trading.available", 0] },
                { $ifNull: ["$balances.trading.onHold", 0] },
              ],
            },
          },
        },
      },
    ]),
    UserPackage.countDocuments({ status: "active" }),
    User.countDocuments({ sponsorId: { $ne: null } }),
    // 30-day daily paid-deposit volume.
    Deposit.aggregate<{ _id: string; value: number }>([
      { $match: { status: "paid", createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, value: { $sum: "$amountUsd" } } },
      { $sort: { _id: 1 } },
    ]),
    // 30-day daily paid-withdrawal volume.
    Withdrawal.aggregate<{ _id: string; value: number }>([
      { $match: { status: "paid", createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, value: { $sum: "$amount" } } },
      { $sort: { _id: 1 } },
    ]),
    ActivityLog.find({}).sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  // Users by status (default every bucket to 0).
  const byStatus: AdminUsersByStatus = { active: 0, suspended: 0, banned: 0 };
  for (const b of byStatusAgg) {
    if (b._id === "active" || b._id === "suspended" || b._id === "banned") {
      byStatus[b._id] = b.count;
    }
  }

  // Withdrawals by status (default every bucket to 0).
  const byStatusW: Record<WithdrawalStatus, number> = {
    pending: 0,
    under_review: 0,
    approved: 0,
    paid: 0,
    rejected: 0,
    cancelled: 0,
  };
  for (const w of withdrawalByStatusAgg) {
    if (w._id && (WITHDRAWAL_STATUSES as string[]).includes(w._id)) {
      byStatusW[w._id as WithdrawalStatus] = w.count;
    }
  }
  const totalWithdrawals: AdminWithdrawalTotals = {
    count: withdrawalPaidAgg[0]?.count ?? 0,
    sumUsd: withdrawalPaidAgg[0]?.sum ?? 0,
    byStatus: byStatusW,
  };

  const kpis: AdminDashboardKpis = {
    totalUsers,
    byStatus,
    totalDeposits: {
      count: depositAgg[0]?.count ?? 0,
      sumUsd: depositAgg[0]?.sum ?? 0,
    },
    totalWithdrawals,
    aum: aumAgg[0]?.aum ?? 0,
    activePackages,
    sponsors,
  };

  // Merge the two daily series into one point per date present in either.
  const depositMap = new Map(depositSeriesAgg.map((d) => [d._id, d.value]));
  const withdrawalMap = new Map(withdrawalSeriesAgg.map((d) => [d._id, d.value]));
  const dates = Array.from(new Set([...depositMap.keys(), ...withdrawalMap.keys()])).sort();
  const series: AdminDashboardSeriesPoint[] = dates.map((date) => ({
    date,
    deposits: depositMap.get(date) ?? 0,
    withdrawals: withdrawalMap.get(date) ?? 0,
  }));

  // Recent activity with actor names (null for system events / unknown actors).
  const actorIds = recentLogs.map((l) => l.actor?.toString()).filter((id): id is string => Boolean(id));
  const actorMap = new Map<string, string>();
  if (actorIds.length) {
    const actors = await User.find({ _id: { $in: actorIds } }).select("name").lean();
    for (const a of actors) actorMap.set(a._id.toString(), a.name);
  }
  const recentActivity: AdminDashboardActivityRow[] = recentLogs.map((l) => ({
    id: l._id.toString(),
    actorName: l.actor ? (actorMap.get(l.actor.toString()) ?? null) : null,
    action: l.action,
    createdAt: l.createdAt instanceof Date ? l.createdAt.toISOString() : new Date(l.createdAt).toISOString(),
  }));

  return { kpis, series, recentActivity };
}