import { Rank, User, WalletTransaction, ActivityLog } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../config/logger.js";
import { applyLedgerEntry } from "./wallet.service.js";
import { sendNotificationEmail } from "./email.service.js";
import { rankAchievementTemplate } from "./emailTemplates.js";
import { getTeamCounts, type TeamCounts } from "./referral.service.js";
import type { RankRow, RankInfo, RankStatus, RankEvalSummary } from "@zaminex/shared";

/* ------------------------------------------------------------------ */
/*  Mapper                                                             */
/* ------------------------------------------------------------------ */

type LeanRank = {
  _id: { toString(): string };
  name: string;
  order: number;
  requiredDirects: number;
  requiredTeamSize: number;
  rewardAmount: number;
  status?: string | null;
  description?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

function toIso(d: Date | string | null | undefined): string {
  if (d instanceof Date) return d.toISOString();
  if (typeof d === "string") return d;
  return new Date().toISOString();
}

function toRankRow(r: LeanRank): RankRow {
  return {
    id: r._id.toString(),
    name: r.name,
    order: r.order,
    requiredDirects: r.requiredDirects,
    requiredTeamSize: r.requiredTeamSize,
    rewardAmount: r.rewardAmount,
    status: (r.status ?? "active") as RankStatus,
    description: r.description ?? null,
    createdAt: toIso(r.createdAt),
    updatedAt: toIso(r.updatedAt),
  };
}

/* ------------------------------------------------------------------ */
/*  Admin CRUD                                                         */
/* ------------------------------------------------------------------ */

export interface CreateRankInput {
  name: string;
  order: number;
  requiredDirects: number;
  requiredTeamSize: number;
  rewardAmount: number;
  status?: RankStatus;
  description?: string;
}

export async function createRank(input: CreateRankInput): Promise<RankRow> {
  const created = await Rank.create({
    name: input.name,
    order: input.order,
    requiredDirects: input.requiredDirects,
    requiredTeamSize: input.requiredTeamSize,
    rewardAmount: input.rewardAmount,
    status: input.status ?? "active",
    description: input.description ?? null,
  });
  return toRankRow(created.toObject() as never);
}

export interface ListRanksArgs {
  status?: RankStatus;
  page: number;
  limit: number;
}

/** `GET /ranks` — paginated, filterable rank list (admin). */
export async function listRanks(args: ListRanksArgs) {
  const page = Math.max(1, args.page);
  const limit = Math.min(50, Math.max(1, args.limit));
  const filter: Record<string, unknown> = {};
  if (args.status) filter.status = args.status;

  const [rows, total] = await Promise.all([
    Rank.find(filter).sort({ order: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Rank.countDocuments(filter),
  ]);

  return {
    items: rows.map((r) => toRankRow(r as never)),
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

/** `GET /ranks/:id` — single rank (admin). */
export async function getRank(id: string): Promise<RankRow> {
  const r = await Rank.findById(id).lean();
  if (!r) throw ApiError.notFound("Rank not found");
  return toRankRow(r as never);
}

export interface UpdateRankInput {
  name?: string;
  order?: number;
  requiredDirects?: number;
  requiredTeamSize?: number;
  rewardAmount?: number;
  status?: RankStatus;
  description?: string;
}

/** `PATCH /ranks/:id` — update a rank (admin). */
export async function updateRank(id: string, patch: UpdateRankInput): Promise<RankRow> {
  const $set: Record<string, unknown> = {};
  if (patch.name !== undefined) $set.name = patch.name;
  if (patch.order !== undefined) $set.order = patch.order;
  if (patch.requiredDirects !== undefined) $set.requiredDirects = patch.requiredDirects;
  if (patch.requiredTeamSize !== undefined) $set.requiredTeamSize = patch.requiredTeamSize;
  if (patch.rewardAmount !== undefined) $set.rewardAmount = patch.rewardAmount;
  if (patch.status !== undefined) $set.status = patch.status;
  if (patch.description !== undefined) $set.description = patch.description;

  const updated = await Rank.findByIdAndUpdate(id, { $set }, { new: true }).lean();
  if (!updated) throw ApiError.notFound("Rank not found");
  return toRankRow(updated as never);
}

/** `DELETE /ranks/:id` — remove a rank (admin). */
export async function deleteRank(id: string): Promise<void> {
  const res = await Rank.deleteOne({ _id: id });
  if (res.deletedCount === 0) throw ApiError.notFound("Rank not found");
}

/* ------------------------------------------------------------------ */
/*  Rank info (read-only dashboard slice)                              */
/* ------------------------------------------------------------------ */

type LeanRankLadder = {
  _id: { toString(): string };
  name: string;
  order: number;
  requiredDirects: number;
  requiredTeamSize: number;
  rewardAmount: number;
};

/** Active ranks sorted by `order` ascending (the qualification ladder). */
async function activeLadder(): Promise<LeanRankLadder[]> {
  return Rank.find({ status: "active" }).sort({ order: 1 }).lean();
}

/** Star level (0..10) for a given all-level team size. Star N requires
 *  `teamCount >= 3^N` (3,9,27,81,243,729,2187,6561,19683,59049). Returns 0
 *  below 3 and caps at 10. Pure function — the canonical team-size→star map
 *  shared by the rank ladder and the monthly community bonus. */
export function getStarFromTeamSize(teamCount: number): number {
  if (teamCount < 3) return 0;
  let star = 0;
  let threshold = 1; // 3^0
  while (star < 10 && teamCount >= threshold * 3) {
    threshold *= 3;
    star++;
  }
  return star;
}

/** A user's direct + all-level team counts, reusing a caller's slice if given. */
async function resolveCounts(userId: string, counts?: TeamCounts): Promise<TeamCounts> {
  if (counts) return counts;
  return getTeamCounts(userId);
}

/**
 * Read-only rank slice for the dashboard: the highest ladder rank the user
 * qualifies for (current), the next ladder step (nextRank), and progress
 * toward it (min of the direct & team ratios, capped 0..1). Defaults to the
 * lowest ladder rank (e.g. "Starter") with progress 0 when none qualify.
 */
export async function getRankInfo(userId: string, counts?: TeamCounts): Promise<RankInfo> {
  const ladder = await activeLadder();
  if (ladder.length === 0) {
    return { name: "Starter", nextRank: null, progress: 1 };
  }

  const { directCount, teamCount } = await resolveCounts(userId, counts);

  // Find the highest qualifying rank. The ladder is sorted by `order`; we stop
  // at the first non-qualifying rank so an out-of-order requirement can't skip
  // a tier. Starter (0/0) always qualifies, so currentIdx >= 0 in practice.
  let currentIdx = -1;
  for (let i = 0; i < ladder.length; i++) {
    const r = ladder[i];
    if (directCount >= r.requiredDirects && teamCount >= r.requiredTeamSize) {
      currentIdx = i;
    } else {
      break;
    }
  }

  let currentName: string;
  let next: LeanRankLadder | null;
  if (currentIdx >= 0) {
    currentName = ladder[currentIdx].name;
    next = currentIdx + 1 < ladder.length ? ladder[currentIdx + 1] : null;
  } else {
    // No rank qualifies (lowest tier has non-zero requirements): show the
    // first tier as the target with the user working toward it from below.
    currentName = "Unranked";
    next = ladder[0];
  }

  let progress = 1;
  if (next) {
    const directRatio = next.requiredDirects > 0 ? directCount / next.requiredDirects : 1;
    const teamRatio = next.requiredTeamSize > 0 ? teamCount / next.requiredTeamSize : 1;
    progress = Math.min(directRatio, teamRatio);
    if (progress < 0) progress = 0;
    if (progress > 1) progress = 1;
  }

  return {
    name: currentName,
    nextRank: next ? next.name : null,
    progress,
  };
}

/* ------------------------------------------------------------------ */
/*  Rank evaluation + awarding                                         */
/* ------------------------------------------------------------------ */

/** Has `userId` already been awarded rank `rankId`? (ledger row exists) */
async function isRankAwarded(rankId: string, userId: string): Promise<boolean> {
  const doc = await WalletTransaction.exists({
    user: userId,
    type: "rank_reward",
    "reference.resourceId": `rank:${rankId}:${userId}`,
  });
  return Boolean(doc);
}

/**
 * Evaluate the rank ladder for a single user: for each rank they qualify for
 * (in ladder order, stopping at the first non-qualifying rank), award its
 * `rewardAmount` once if not already awarded. Idempotent via
 * `rank:<rankId>:<userId>`. Returns the count of new awards and errors.
 */
export async function evaluateRankForUser(userId: string): Promise<{ awarded: number; errors: number }> {
  const ladder = await activeLadder();
  if (ladder.length === 0) return { awarded: 0, errors: 0 };

  const { directCount, teamCount } = await getTeamCounts(userId);
  // Fetched once so each new award can fire a notification email without an
  // extra query per rank in the loop.
  const user = await User.findById(userId).lean();
  let awarded = 0;
  let errors = 0;

  for (const rank of ladder) {
    if (!(directCount >= rank.requiredDirects && teamCount >= rank.requiredTeamSize)) break;
    if (rank.rewardAmount <= 0) continue; // e.g. Starter pays nothing
    const rankId = rank._id.toString();
    if (await isRankAwarded(rankId, userId)) continue;
    try {
      await applyLedgerEntry({
        userId,
        wallet: "bonus",
        field: "available",
        direction: "credit",
        amount: rank.rewardAmount,
        type: "rank_reward",
        reference: { resource: "Rank", resourceId: `rank:${rankId}:${userId}` },
        memo: `Rank reward — ${rank.name}`,
        meta: { rankId, name: rank.name, directCount, teamCount },
      });
      awarded++;
      await ActivityLog.create({
        actor: userId,
        action: "compensation.rank_reward",
        resource: "Rank",
        resourceId: rankId,
        meta: { name: rank.name, amount: rank.rewardAmount, directCount, teamCount },
      }).catch(() => undefined);
      // Fire-and-forget: bulk "run for all" would otherwise serialize SMTP sends.
      if (user) {
        void sendNotificationEmail(
          user,
          rankAchievementTemplate({ name: user.name, rankName: rank.name, rewardAmount: rank.rewardAmount }),
        );
      }
    } catch (err) {
      errors++;
      logger.error("Rank award failed", {
        userId,
        rankId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { awarded, errors };
}

/**
 * Evaluate the rank ladder for every user (admin trigger). Aggregates per-user
 * results into a single summary.
 */
export async function runRankCheckAll(): Promise<RankEvalSummary> {
  const userIds = await User.distinct("_id");
  let awarded = 0;
  let errors = 0;

  for (const id of userIds) {
    const r = await evaluateRankForUser(id.toString());
    awarded += r.awarded;
    errors += r.errors;
  }

  return { evaluated: userIds.length, awarded, errors };
}