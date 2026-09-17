import { Rank, User, UserPackage, WalletTransaction, ActivityLog } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { logger } from "../config/logger.js";
import { applyLedgerEntry } from "./wallet.service.js";
import { sendNotificationEmail } from "./email.service.js";
import { rankAchievementTemplate } from "./emailTemplates.js";
import { MAX_STAR, STAR_REQUIREMENTS, computeQualifiedStar, perLevelActiveTeamCounts } from "./starQualification.service.js";
import type { RankRow, RankInfo, RankStatus, RankEvalSummary } from "@zeminex/shared";

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
 *  below 3 and caps at 10. Pure function — legacy team-size→star map, kept for
 *  tests/reports; the live ladder and `highestStar` now qualify on active
 *  DIRECT count instead (1 Star = 1 active direct, …). */
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

/**
 * A user's current star per the shared Star Qualification Engine
 * (starQualification.service.ts): sequential 3^N ACTIVE members AT lineage
 * level N — level 1 must pass before level 2 counts, etc. The SAME engine
 * that drives the Daily Team Energy Bonus and the Community Monthly Bonus —
 * the rank ladder no longer re-implements its own direct/team-count rule, so
 * the star shown on the Rank Card always matches the star shown on the Team
 * Energy card.
 */
async function resolveStar(userId: string, maxLevel: number): Promise<{ star: number; levelCounts: Map<number, number> }> {
  const levelCounts = await perLevelActiveTeamCounts(userId, maxLevel);
  const star = computeQualifiedStar(levelCounts, maxLevel);
  return { star, levelCounts };
}

/**
 * Read-only rank slice for the dashboard: the ladder rank matching the user's
 * current Star Qualification Engine star (current), the next ladder rung
 * (nextRank), and progress toward it (active count at the next level vs its
 * 3^N requirement). Defaults to "Starter" (order 0, always qualifies).
 */
export async function getRankInfo(userId: string): Promise<RankInfo> {
  const ladder = await activeLadder();
  if (ladder.length === 0) {
    return { name: "Starter", nextRank: null, progress: 1 };
  }

  const maxLevel = Math.min(MAX_STAR, ladder[ladder.length - 1]?.order || MAX_STAR);
  const { star, levelCounts } = await resolveStar(userId, maxLevel);

  const current = ladder.find((r) => r.order === star) ?? null;
  const next = ladder.find((r) => r.order === star + 1) ?? null;

  const currentName = current ? current.name : "Unranked";

  let progress = 1;
  if (next) {
    const required = STAR_REQUIREMENTS[next.order] ?? 0;
    const activeAtNext = levelCounts.get(next.order) ?? 0;
    progress = required > 0 ? Math.min(1, Math.max(0, activeAtNext / required)) : 1;
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
 * Evaluate the rank ladder for a single user: pay ONLY the highest rung the
 * user qualifies for, once. Lower rungs are never paid — a user who jumps
 * straight to Star 2 receives only Star 2's reward (Star 1 is skipped). Each
 * star is paid exactly once, at the moment it first becomes the user's highest
 * achieved rung; climbing Star 2 → Star 3 later pays only Star 3. Idempotent
 * via `rank:<rankId>:<userId>`. Returns 0/1 new award and 0/1 error.
 */
export async function evaluateRankForUser(userId: string): Promise<{ awarded: number; errors: number }> {
  const ladder = await activeLadder();
  if (ladder.length === 0) return { awarded: 0, errors: 0 };

  // Keep the sticky highest-star fresh on every eval trigger (registration,
  // activation, admin runs) — rank display + one-time rank rewards read this
  // value. The income bonuses (Team Energy / Community) use the separate
  // per-level engine star, recalc'ed on the same triggers. Idempotent ($max).
  await syncHighestStarForUser(userId).catch(() => undefined);

  // Anti-farming: a user only earns rank rewards while holding an active
  // UserPackage — the same guard the direct-connect bonus and the monthly
  // community bonus apply. Without this, a non-package-holding upline member
  // (e.g. the root admin) could collect rank rewards purely on team size.
  const activePkg = await UserPackage.exists({ user: userId, status: "active" });
  if (!activePkg) return { awarded: 0, errors: 0 };

  // Star Qualification Engine — same sequential 3^N-per-level rule the Team
  // Energy and Community Monthly bonuses use (starQualification.service.ts).
  const maxLevel = Math.min(MAX_STAR, ladder[ladder.length - 1]?.order || MAX_STAR);
  const { star } = await resolveStar(userId, maxLevel);
  // Fetched once so the award notification email doesn't need an extra query.
  const user = await User.findById(userId).lean();

  const topRank = ladder.find((rank) => rank.order === star) ?? null;
  if (!topRank || topRank.rewardAmount <= 0) return { awarded: 0, errors: 0 }; // e.g. Starter pays nothing

  const rankId = topRank._id.toString();
  if (await isRankAwarded(rankId, userId)) return { awarded: 0, errors: 0 };

  try {
    await applyLedgerEntry({
      userId,
      wallet: "bonus",
      field: "available",
      direction: "credit",
      amount: topRank.rewardAmount,
      type: "rank_reward",
      reference: { resource: "Rank", resourceId: `rank:${rankId}:${userId}` },
      memo: `Rank reward — ${topRank.name}`,
      meta: { rankId, name: topRank.name, star },
    });
    await ActivityLog.create({
      actor: userId,
      action: "compensation.rank_reward",
      resource: "Rank",
      resourceId: rankId,
      meta: { name: topRank.name, amount: topRank.rewardAmount, star },
    }).catch(() => undefined);
    // Fire-and-forget: bulk "run for all" would otherwise serialize SMTP sends.
    if (user) {
      void sendNotificationEmail(
        user,
        rankAchievementTemplate({ name: user.name, rankName: topRank.name, rewardAmount: topRank.rewardAmount }),
      );
    }
    return { awarded: 1, errors: 0 };
  } catch (err) {
    logger.error("Rank award failed", {
      userId,
      rankId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { awarded: 0, errors: 1 };
  }
}

/**
 * Ratchet `User.highestStar` up to the rank-ladder rung matching the user's
 * current Star Qualification Engine star — the SAME sequential 3^N-per-level
 * engine the Daily Team Energy Bonus and Community Monthly Bonus consume
 * (starQualification.service.ts), so the Rank Card always agrees with the
 * Team Energy card. `requiredDirects`/`requiredTeamSize` on the Rank ladder
 * are no longer read for qualification — only `order`/`name`/`rewardAmount`.
 *
 * Sticky by design: `$max` never lowers the stored value, even if the user's
 * team later shrinks below the threshold that earned it. Drives the one-time
 * rank rewards + rank display.
 */
export async function syncHighestStarForUser(userId: string): Promise<void> {
  const ladder = await activeLadder();
  if (ladder.length === 0) return;

  const maxLevel = Math.min(MAX_STAR, ladder[ladder.length - 1]?.order || MAX_STAR);
  const { star } = await resolveStar(userId, maxLevel);
  if (star <= 0) return;

  await User.updateOne({ _id: userId }, { $max: { highestStar: star } });
}

/**
 * Evaluate the rank ladder for every ancestor in a lineage chain — fired
 * immediately after a member activates (their ACTIVE status changes per-level
 * ACTIVE counts across the whole chain). Each ancestor is evaluated
 * individually (idempotent via the ledger key), so every ancestor whose star
 * rose at this moment is paid at once instead of waiting for the daily
 * `rank_check` cron. Returns the aggregated award/error counts.
 */
export async function evaluateRankForChain(ancestorIds: string[]): Promise<{ awarded: number; errors: number }> {
  const seen = new Set<string>();
  let awarded = 0;
  let errors = 0;
  for (const id of ancestorIds) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const r = await evaluateRankForUser(id).catch(() => ({ awarded: 0, errors: 1 }));
    awarded += r.awarded;
    errors += r.errors;
  }
  return { awarded, errors };
}

/**
 * Evaluate the rank ladder for every user (admin trigger). Aggregates per-user
 * results into a single summary.
 */
export async function runRankCheckAll(): Promise<RankEvalSummary> {
  // Only active-package holders are eligible for rank rewards (anti-farming,
  // consistent with the direct + community bonuses). Mirrors the community run.
  const userIds = (await UserPackage.find({ status: "active" }).distinct("user")).map((id) =>
    id.toString(),
  );
  let awarded = 0;
  let errors = 0;

  for (const id of userIds) {
    const r = await evaluateRankForUser(id.toString());
    awarded += r.awarded;
    errors += r.errors;
    await syncHighestStarForUser(id.toString()).catch((err) => {
      logger.error("highestStar sync failed", {
        userId: id.toString(),
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  return { evaluated: userIds.length, awarded, errors };
}