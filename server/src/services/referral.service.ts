import mongoose from "mongoose";
import { User } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";
import type {
  ReferralMemberRow,
  ReferralMemberStatus,
  ReferralPage,
  ReferralStats,
} from "@zaminex/shared";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Escape a user-supplied search string for safe use in a RegExp. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toOid(id: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(id);
}

/** Counts per row via a $lookup-count pipeline (no child docs loaded). */
const DIRECT_COUNT_LOOKUP = [
  {
    $lookup: {
      from: "users",
      let: { pid: "$_id" },
      pipeline: [{ $match: { $expr: { $eq: ["$sponsorId", "$$pid"] } } }, { $count: "n" }],
      as: "_kidsCount",
    },
  },
  { $addFields: { directCount: { $ifNull: [{ $arrayElemAt: ["$_kidsCount.n", 0] }, 0] } } },
  { $project: { _kidsCount: 0 } },
];

/** Shape an aggregation row into a `ReferralMemberRow`. */
function toMemberRow(r: {
  _id: { toString(): string };
  name: string;
  referralCode: string;
  status: string;
  createdAt?: Date | string;
  lineage?: unknown[];
  directCount?: number;
}): ReferralMemberRow {
  const level = Array.isArray(r.lineage) ? r.lineage.length : 0;
  const joinedAt =
    r.createdAt instanceof Date
      ? r.createdAt.toISOString()
      : typeof r.createdAt === "string"
        ? r.createdAt
        : new Date().toISOString();
  return {
    id: r._id.toString(),
    name: r.name,
    referralCode: r.referralCode,
    status: r.status as ReferralMemberStatus,
    joinedAt,
    directCount: typeof r.directCount === "number" ? r.directCount : 0,
    level,
  };
}

/* ------------------------------------------------------------------ */
/*  Team counts (shared by dashboard + stats)                          */
/* ------------------------------------------------------------------ */

export interface TeamCounts {
  directCount: number;
  teamCount: number;
  activeDirectCount: number;
  activeTeamCount: number;
}

/** Direct + all-level descendant counts (with active breakdowns). */
export async function getTeamCounts(userId: string): Promise<TeamCounts> {
  const [directCount, teamCount, activeDirectCount, activeTeamCount] = await Promise.all([
    User.countDocuments({ sponsorId: userId }),
    User.countDocuments({ lineage: userId }),
    User.countDocuments({ sponsorId: userId, status: "active" }),
    User.countDocuments({ lineage: userId, status: "active" }),
  ]);
  return { directCount, teamCount, activeDirectCount, activeTeamCount };
}

/* ------------------------------------------------------------------ */
/*  Stats — code/link + counts + by-level breakdown                     */
/* ------------------------------------------------------------------ */

/** `GET /referrals/me` — referral code/link + team statistics. */
export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const user = await User.findById(userId).select("referralCode").lean();
  if (!user) throw ApiError.notFound("User not found");

  const [counts, byLevelAgg] = await Promise.all([
    getTeamCounts(userId),
    User.aggregate<{ _id: number; count: number; active: number }>([
      { $match: { lineage: toOid(userId) } },
      {
        $project: {
          level: { $subtract: [{ $size: "$lineage" }, { $indexOfArray: ["$lineage", toOid(userId)] }] },
          status: 1,
        },
      },
      {
        $group: {
          _id: "$level",
          count: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const byLevel = byLevelAgg.map((r) => ({ level: r._id, count: r.count, active: r.active }));

  return {
    code: user.referralCode,
    link: `${env.CLIENT_URL}/?ref=${user.referralCode}`,
    ...counts,
    byLevel,
  };
}

/* ------------------------------------------------------------------ */
/*  Direct referrals list                                              */
/* ------------------------------------------------------------------ */

export interface GetReferralsArgs {
  status?: ReferralMemberStatus;
  q?: string;
  page: number;
  limit: number;
}

/** `GET /referrals/direct` — the viewer's level-1 referrals (paginated). */
export async function getDirectReferrals(userId: string, args: GetReferralsArgs): Promise<ReferralPage> {
  const page = Math.max(1, args.page);
  const limit = Math.min(50, Math.max(1, args.limit));

  const filter: Record<string, unknown> = { sponsorId: userId };
  if (args.status) filter.status = args.status;
  if (args.q) {
    const rx = new RegExp(escapeRegex(args.q), "i");
    filter.$or = [{ name: rx }, { referralCode: rx }];
  }

  const [rows, total] = await Promise.all([
    User.aggregate([
      { $match: filter },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      ...DIRECT_COUNT_LOOKUP,
      { $project: { name: 1, referralCode: 1, status: 1, createdAt: 1, lineage: 1, directCount: 1 } },
    ]),
    User.countDocuments(filter),
  ]);

  return {
    items: rows.map((r) => toMemberRow(r as never)),
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

/* ------------------------------------------------------------------ */
/*  Tree children (lazy expansion)                                     */
/* ------------------------------------------------------------------ */

export interface GetChildrenArgs {
  page: number;
  limit: number;
}

/**
 * `GET /referrals/children/:userId` — direct children of a node for lazy tree
 * expansion. `userId` may be `"me"` (the viewer) or an id **within the viewer's
 * own subtree** (404 otherwise — no-leak, only your own downline).
 */
export async function getTreeChildren(
  requesterId: string,
  targetUserId: string,
  args: GetChildrenArgs,
): Promise<ReferralPage> {
  const page = Math.max(1, args.page);
  const limit = Math.min(50, Math.max(1, args.limit));

  const requester = await User.findById(requesterId).select("_id lineage").lean();
  if (!requester) throw ApiError.notFound("User not found");

  let targetId: mongoose.Types.ObjectId;
  if (targetUserId === "me") {
    targetId = requester._id;
  } else {
    const target = await User.findById(targetUserId).select("_id lineage").lean();
    if (!target) throw ApiError.notFound("Node not found");
    // Authorisation: the viewer may only expand their own subtree.
    const inSubtree =
      target._id.equals(requester._id) ||
      (target.lineage ?? []).some((a) => a?.toString() === requesterId);
    if (!inSubtree) throw ApiError.notFound("Node not found");
    targetId = target._id;
  }

  const filter = { sponsorId: targetId };
  const [rows, total] = await Promise.all([
    User.aggregate([
      { $match: filter },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      ...DIRECT_COUNT_LOOKUP,
      { $project: { name: 1, referralCode: 1, status: 1, createdAt: 1, lineage: 1, directCount: 1 } },
    ]),
    User.countDocuments(filter),
  ]);

  return {
    items: rows.map((r) => toMemberRow(r as never)),
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}