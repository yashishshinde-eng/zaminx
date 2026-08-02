import { BonanzaOffer, User } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { isBonanzaAwarded } from "./compensation.service.js";
import type {
  BonanzaOfferRow,
  BonanzaOfferView,
  BonanzaOverview,
  BonanzaStatus,
} from "@zaminex/shared";

/* ------------------------------------------------------------------ */
/*  Mapper                                                             */
/* ------------------------------------------------------------------ */

type LeanOffer = {
  _id: { toString(): string };
  name: string;
  requiredDirects: number;
  rewardAmount: number;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  status?: string | null;
  terms?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

function toIso(d: Date | string | null | undefined): string {
  if (d instanceof Date) return d.toISOString();
  if (typeof d === "string") return d;
  return new Date().toISOString();
}

function toOfferRow(o: LeanOffer): BonanzaOfferRow {
  return {
    id: o._id.toString(),
    name: o.name,
    requiredDirects: o.requiredDirects,
    rewardAmount: o.rewardAmount,
    startDate: toIso(o.startDate ?? null),
    endDate: toIso(o.endDate ?? null),
    status: (o.status ?? "active") as BonanzaStatus,
    terms: o.terms ?? null,
    createdAt: toIso(o.createdAt),
    updatedAt: toIso(o.updatedAt),
  };
}

/* ------------------------------------------------------------------ */
/*  User overview                                                      */
/* ------------------------------------------------------------------ */

/**
 * `GET /bonanzas` — the viewer's direct count plus every active offer with
 * their progress (`directCount` vs `requiredDirects`) and award state.
 */
export async function getBonanzaOverview(userId: string): Promise<BonanzaOverview> {
  const now = new Date();
  const [offers, directCount] = await Promise.all([
    BonanzaOffer.find({ status: "active", startDate: { $lte: now }, endDate: { $gte: now } })
      .sort({ requiredDirects: 1 })
      .lean(),
    User.countDocuments({ sponsorId: userId }),
  ]);

  const views: BonanzaOfferView[] = [];
  for (const o of offers) {
    const id = o._id.toString();
    views.push({
      id,
      name: o.name,
      requiredDirects: o.requiredDirects,
      rewardAmount: o.rewardAmount,
      startDate: toIso(o.startDate ?? null),
      endDate: toIso(o.endDate ?? null),
      terms: o.terms ?? null,
      directCount,
      qualified: directCount >= o.requiredDirects,
      awarded: await isBonanzaAwarded(id, userId),
    });
  }

  return { directCount, offers: views };
}

/* ------------------------------------------------------------------ */
/*  Admin CRUD                                                         */
/* ------------------------------------------------------------------ */

export interface CreateBonanzaInput {
  name: string;
  requiredDirects: number;
  rewardAmount: number;
  startDate: Date;
  endDate: Date;
  status?: BonanzaStatus;
  terms?: string;
}

export async function createBonanza(input: CreateBonanzaInput): Promise<BonanzaOfferRow> {
  const created = await BonanzaOffer.create({
    name: input.name,
    requiredDirects: input.requiredDirects,
    rewardAmount: input.rewardAmount,
    startDate: input.startDate,
    endDate: input.endDate,
    status: input.status ?? "active",
    terms: input.terms ?? null,
  });
  return toOfferRow(created.toObject() as never);
}

export interface ListBonanzasArgs {
  status?: BonanzaStatus;
  page: number;
  limit: number;
}

/** `GET /bonanzas/admin` — paginated, filterable offer list (admin). */
export async function listBonanzas(args: ListBonanzasArgs) {
  const page = Math.max(1, args.page);
  const limit = Math.min(50, Math.max(1, args.limit));
  const filter: Record<string, unknown> = {};
  if (args.status) filter.status = args.status;

  const [rows, total] = await Promise.all([
    BonanzaOffer.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    BonanzaOffer.countDocuments(filter),
  ]);

  return {
    items: rows.map((r) => toOfferRow(r as never)),
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

/** `GET /bonanzas/admin/:id` — single offer (admin). */
export async function getBonanza(id: string): Promise<BonanzaOfferRow> {
  const o = await BonanzaOffer.findById(id).lean();
  if (!o) throw ApiError.notFound("Bonanza offer not found");
  return toOfferRow(o as never);
}

export interface UpdateBonanzaInput {
  name?: string;
  requiredDirects?: number;
  rewardAmount?: number;
  startDate?: Date;
  endDate?: Date;
  status?: BonanzaStatus;
  terms?: string;
}

/** `PATCH /bonanzas/admin/:id` — update an offer (admin). */
export async function updateBonanza(id: string, patch: UpdateBonanzaInput): Promise<BonanzaOfferRow> {
  const $set: Record<string, unknown> = {};
  if (patch.name !== undefined) $set.name = patch.name;
  if (patch.requiredDirects !== undefined) $set.requiredDirects = patch.requiredDirects;
  if (patch.rewardAmount !== undefined) $set.rewardAmount = patch.rewardAmount;
  if (patch.startDate !== undefined) $set.startDate = patch.startDate;
  if (patch.endDate !== undefined) $set.endDate = patch.endDate;
  if (patch.status !== undefined) $set.status = patch.status;
  if (patch.terms !== undefined) $set.terms = patch.terms;

  const updated = await BonanzaOffer.findByIdAndUpdate(id, { $set }, { new: true }).lean();
  if (!updated) throw ApiError.notFound("Bonanza offer not found");
  return toOfferRow(updated as never);
}

/** `DELETE /bonanzas/admin/:id` — remove an offer (admin). */
export async function deleteBonanza(id: string): Promise<void> {
  const res = await BonanzaOffer.deleteOne({ _id: id });
  if (res.deletedCount === 0) throw ApiError.notFound("Bonanza offer not found");
}