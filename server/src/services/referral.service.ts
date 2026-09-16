import mongoose from "mongoose";
import { User, UserPackage } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";
import type {
  ReferralMemberRow,
  ReferralMemberStatus,
  ReferralPage,
  ReferralStats,
} from "@zeminex/shared";

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

/** Round to 2 decimals — guards against float noise from summing currency. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
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

/**
 * Direct + team descendant counts (with active breakdowns). `teamCount`/
 * `activeTeamCount` are capped at 10 levels deep — matching the by-level
 * breakdown and Level filter in `getReferralStats` below, and the Star
 * Qualification Engine's `MAX_STAR` depth — so the dashboard/Team page total
 * never exceeds what the by-level table actually shows.
 */
export async function getTeamCounts(userId: string): Promise<TeamCounts> {
  const oid = toOid(userId);
  const [directCount, activeDirectCount, teamAgg] = await Promise.all([
    User.countDocuments({ sponsorId: userId }),
    User.countDocuments({ sponsorId: userId, status: "active" }),
    User.aggregate<{ teamCount: number; activeTeamCount: number }>([
      { $match: { lineage: oid } },
      {
        $project: {
          level: { $subtract: [{ $size: "$lineage" }, { $indexOfArray: ["$lineage", oid] }] },
          status: 1,
        },
      },
      { $match: { level: { $lte: 10 } } },
      {
        $group: {
          _id: null,
          teamCount: { $sum: 1 },
          activeTeamCount: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
        },
      },
    ]),
  ]);
  return {
    directCount,
    activeDirectCount,
    teamCount: teamAgg[0]?.teamCount ?? 0,
    activeTeamCount: teamAgg[0]?.activeTeamCount ?? 0,
  };
}

/* ------------------------------------------------------------------ */
/*  Stats — code/link + counts + by-level breakdown                     */
/* ------------------------------------------------------------------ */

/** `GET /referrals/me` — referral code/link + team statistics. */
export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const user = await User.findById(userId).select("referralCode").lean();
  if (!user) throw ApiError.notFound("User not found");

  const [counts, byLevelAgg, byLevelBusinessAgg] = await Promise.all([
    getTeamCounts(userId),
    User.aggregate<{ _id: number; count: number; active: number }>([
      { $match: { lineage: toOid(userId) } },
      {
        $project: {
          level: { $subtract: [{ $size: "$lineage" }, { $indexOfArray: ["$lineage", toOid(userId)] }] },
          status: 1,
        },
      },
      // Cap the by-level breakdown at 10 levels — deeper levels aren't shown
      // in the team statistics section or the Level filter picker.
      { $match: { level: { $lte: 10 } } },
      {
        $group: {
          _id: "$level",
          count: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    // Per-level business volume: sum of active UserPackages' snapshot.priceUsd,
    // bucketed by the owner's relative level in the viewer's downline. Matches
    // the byLevel cap of 10 levels so the two aggregations stay in sync.
    UserPackage.aggregate<{ _id: number; business: number }>([
      { $match: { status: "active" } },
      { $lookup: { from: "users", localField: "user", foreignField: "_id", as: "_u" } },
      { $unwind: "$_u" },
      { $match: { "_u.lineage": toOid(userId) } },
      {
        $addFields: {
          relLevel: {
            $subtract: [{ $size: "$_u.lineage" }, { $indexOfArray: ["$_u.lineage", toOid(userId)] }],
          },
        },
      },
      { $match: { relLevel: { $lte: 10 } } },
      { $group: { _id: "$relLevel", business: { $sum: "$snapshot.priceUsd" } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const businessByLevel = new Map(byLevelBusinessAgg.map((r) => [r._id, round2(r.business)]));
  const byLevel = byLevelAgg.map((r) => ({
    level: r._id,
    count: r.count,
    active: r.active,
    business: businessByLevel.get(r._id) ?? 0,
  }));
  const teamBusiness = round2(byLevelBusinessAgg.reduce((s, r) => s + r.business, 0));

  return {
    code: user.referralCode,
    link: `${env.CLIENT_URL}/?ref=${user.referralCode}`,
    ...counts,
    byLevel,
    teamBusiness,
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
/*  Referral code validation (public)                                  */
/* ------------------------------------------------------------------ */

export interface ReferralCodeCheck {
  valid: boolean;
  /** Sponsor display name, only when valid (already semi-public via downline rows). */
  name?: string;
}

/**
 * `GET /referrals/validate?code=` — public pre-submit check that a referral
 * code belongs to an active sponsor. Used by the register form to show a
 * "verified" affordance (for both link-prefilled and manually-entered codes).
 */
export async function validateReferralCode(code: string): Promise<ReferralCodeCheck> {
  const trimmed = code.trim();
  if (!trimmed) return { valid: false };
  const sponsor = await User.findOne({ referralCode: trimmed }).select("name status").lean();
  if (!sponsor || sponsor.status !== "active") return { valid: false };
  return { valid: true, name: sponsor.name };
}

/* ------------------------------------------------------------------ */
/*  Team downline (all levels)                                         */
/* ------------------------------------------------------------------ */

export interface GetTeamReferralsArgs {
  /** Relative level filter (1 = direct, 2 = second level…); omitted = all. */
  level?: number;
  /** `inactive` is a virtual bucket matching inactive OR blocked (any non-active). */
  status?: "active" | "inactive";
  q?: string;
  page: number;
  limit: number;
}

/** Shape an aggregation row into a `ReferralMemberRow` for the team view. */
function toTeamRow(r: {
  _id: { toString(): string };
  name: string;
  referralCode: string;
  status: string;
  createdAt?: Date | string;
  lineage?: unknown[];
  directCount?: number;
  phone?: string;
  relLevel?: number;
}): ReferralMemberRow {
  const level =
    typeof r.relLevel === "number"
      ? r.relLevel
      : Array.isArray(r.lineage)
        ? r.lineage.length
        : 0;
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
    // Phone is a direct-only privilege — never exposed for deeper levels.
    phone: level === 1 && typeof r.phone === "string" && r.phone ? r.phone : undefined,
  };
}

/** Team display cap — the user's account only ever shows levels 1..10. */
export const MAX_TEAM_DISPLAY_LEVEL = 10;

/**
 * `GET /referrals/team` — the viewer's full downline (every descendant via
 * `lineage`), filterable by relative level and status. Phone is returned only
 * for level-1 (direct) rows. The view is capped at 10 levels: an explicit
 * level filter is clamped into 1..10 and the unfiltered list only returns
 * members within the first 10 levels.
 */
export async function getTeamReferrals(userId: string, args: GetTeamReferralsArgs): Promise<ReferralPage> {
  const page = Math.max(1, args.page);
  const limit = Math.min(50, Math.max(1, args.limit));

  const filter: Record<string, unknown> = { lineage: toOid(userId) };
  if (args.status === "active") filter.status = "active";
  else if (args.status === "inactive") filter.status = { $in: ["inactive", "blocked"] };
  if (args.q) {
    const rx = new RegExp(escapeRegex(args.q), "i");
    filter.$or = [{ name: rx }, { referralCode: rx }];
  }

  // Relative level = number of lineage entries *after* the viewer's own id.
  // $indexOfArray is safe because every matched doc has the viewer in lineage.
  const addRelLevel = {
    $addFields: {
      relLevel: { $subtract: [{ $size: "$lineage" }, { $indexOfArray: ["$lineage", toOid(userId)] }] },
    },
  };
  const level =
    args.level !== undefined
      ? Math.min(Math.max(Math.trunc(args.level), 1), MAX_TEAM_DISPLAY_LEVEL)
      : undefined;
  // No explicit level → still capped: only the first 10 levels are listed.
  const levelMatch = [
    { $match: level !== undefined ? { relLevel: level } : { relLevel: { $lte: MAX_TEAM_DISPLAY_LEVEL } } },
  ];

  const basePipeline: mongoose.PipelineStage[] = [
    { $match: filter },
    addRelLevel,
    ...levelMatch,
  ];

  const [rows, countRows] = await Promise.all([
    User.aggregate([
      ...basePipeline,
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      ...DIRECT_COUNT_LOOKUP,
      { $project: { name: 1, referralCode: 1, status: 1, createdAt: 1, lineage: 1, directCount: 1, phone: 1, relLevel: 1 } },
    ]),
    User.aggregate<{ n: number }>([...basePipeline, { $count: "n" }]),
  ]);

  const total = countRows[0]?.n ?? 0;

  return {
    items: rows.map((r) => toTeamRow(r as never)),
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
  let targetDepth = 0; // viewer's own node = team level 0; children of it are level 1
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
    // Relative level of the target under the viewer (viewer itself = 0).
    const idx = (target.lineage ?? []).findIndex((a) => a?.toString() === requesterId);
    targetDepth = target._id.equals(requester._id) ? 0 : (target.lineage?.length ?? 0) - idx;
  }

  // Display cap: nodes at level 10 have no expandable children in the user's
  // account — their children (level 11+) are never served.
  if (targetDepth >= MAX_TEAM_DISPLAY_LEVEL) {
    return { items: [], page, limit, total: 0, totalPages: 0 };
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