import { z } from "zod";

const BONANZA_STATUSES = ["active", "inactive"] as const;

const bonanaBodyFields = {
  name: z.string().trim().min(1, "Name is required").max(120),
  requiredDirects: z.coerce.number().int().min(1, "Required directs must be at least 1"),
  rewardAmount: z.coerce.number().min(0, "Reward amount must be 0 or more"),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: z.enum(BONANZA_STATUSES).default("active"),
  terms: z.string().trim().max(1000).optional(),
};

/** POST /bonanzas/admin — create a bonanza offer (admin). */
export const createBonanzaSchema = z
  .object({ body: z.object(bonanaBodyFields) })
  .refine((d) => d.body.endDate > d.body.startDate, {
    message: "End date must be after start date",
    path: ["body", "endDate"],
  });

/** PATCH /bonanzas/admin/:id — update an offer (admin). All fields optional. */
export const updateBonanzaSchema = z
  .object({
    body: z.object({
      name: z.string().trim().min(1).max(120).optional(),
      requiredDirects: z.coerce.number().int().min(1).optional(),
      rewardAmount: z.coerce.number().min(0).optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      status: z.enum(BONANZA_STATUSES).optional(),
      terms: z.string().trim().max(1000).optional(),
    }),
  })
  .refine(
    (d) =>
      !(d.body.startDate && d.body.endDate) || d.body.endDate > d.body.startDate,
    { message: "End date must be after start date", path: ["body", "endDate"] },
  );

/** GET /bonanzas/admin — paginated, filterable offer list (admin). */
export const bonanzaListQuerySchema = z.object({
  query: z.object({
    status: z.enum(BONANZA_STATUSES).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

/** Path param for /bonanzas/admin/:id (admin). */
export const bonanzaIdParamSchema = z.object({
  params: z.object({ id: z.string().trim().min(1, "Offer id is required") }),
});

/** POST /compensation/run-yield — trigger a daily yield run (admin). */
export const runYieldSchema = z.object({
  query: z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
      .optional(),
  }),
});

/** POST /compensation/evaluate-bonanzas — trigger a bonanza evaluation (admin). */
export const evaluateBonanzaSchema = z.object({
  query: z.object({
    userId: z.string().trim().optional(),
  }),
});

/* ------------------------------------------------------------------ */
/*  Phase 10A — team energy, community, rank triggers + rank CRUD      */
/* ------------------------------------------------------------------ */

const RANK_STATUSES = ["active", "inactive"] as const;

const rankBodyFields = {
  name: z.string().trim().min(1, "Name is required").max(80),
  order: z.coerce.number().int().min(0, "Order must be 0 or more"),
  requiredDirects: z.coerce.number().int().min(0, "Required directs must be 0 or more"),
  requiredTeamSize: z.coerce.number().int().min(0, "Required team size must be 0 or more"),
  rewardAmount: z.coerce.number().min(0, "Reward amount must be 0 or more"),
  status: z.enum(RANK_STATUSES).default("active"),
  description: z.string().trim().max(500).optional(),
};

/** POST /ranks — create a rank (admin). */
export const createRankSchema = z.object({ body: z.object(rankBodyFields) });

/** PATCH /ranks/:id — update a rank (admin). All fields optional. */
export const updateRankSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(80).optional(),
    order: z.coerce.number().int().min(0).optional(),
    requiredDirects: z.coerce.number().int().min(0).optional(),
    requiredTeamSize: z.coerce.number().int().min(0).optional(),
    rewardAmount: z.coerce.number().min(0).optional(),
    status: z.enum(RANK_STATUSES).optional(),
    description: z.string().trim().max(500).optional(),
  }),
});

/** GET /ranks — paginated, filterable rank list (admin). */
export const rankListQuerySchema = z.object({
  query: z.object({
    status: z.enum(RANK_STATUSES).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

/** Path param for /ranks/:id (admin). */
export const rankIdParamSchema = z.object({
  params: z.object({ id: z.string().trim().min(1, "Rank id is required") }),
});

/** POST /compensation/run-team-energy — trigger a daily team-energy run (admin). */
export const runTeamEnergySchema = z.object({
  query: z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
      .optional(),
  }),
});

/** POST /compensation/run-community — trigger a monthly community-bonus run (admin). */
export const runCommunitySchema = z.object({
  query: z.object({
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM")
      .optional(),
  }),
});

/** POST /compensation/run-rank-check — trigger a rank evaluation (admin). */
export const runRankCheckSchema = z.object({
  query: z.object({
    userId: z.string().trim().optional(),
  }),
});

/* ------------------------------------------------------------------ */
/*  Phase 14A — compensation settings (read/update)                     */
/* ------------------------------------------------------------------ */

/**
 * PATCH /admin/settings/compensation — update the global compensation knobs.
 * All fields optional; only provided fields are written via `setSetting`.
 * Percentages are 0..100; `teamEnergyPct` is the per-depth weight array.
 */
export const compensationSettingsSchema = z.object({
  body: z.object({
    directBonusPct: z.coerce.number().min(0).max(100).optional(),
    yieldEnabled: z.boolean().optional(),
    teamEnergyEnabled: z.boolean().optional(),
    teamEnergyDepth: z.coerce.number().int().min(0).max(10).optional(),
    teamEnergyPct: z.array(z.coerce.number().min(0).max(100)).max(10).optional(),
    communityEnabled: z.boolean().optional(),
    communityPct: z.coerce.number().min(0).max(100).optional(),
  }),
});

export type CreateBonanzaBody = z.infer<typeof createBonanzaSchema>["body"];
export type UpdateBonanzaBody = z.infer<typeof updateBonanzaSchema>["body"];
export type BonanzaListQuery = z.infer<typeof bonanzaListQuerySchema>["query"];
export type BonanzaIdParam = z.infer<typeof bonanzaIdParamSchema>["params"];
export type RunYieldQuery = z.infer<typeof runYieldSchema>["query"];
export type EvaluateBonanzaQuery = z.infer<typeof evaluateBonanzaSchema>["query"];
export type CreateRankBody = z.infer<typeof createRankSchema>["body"];
export type UpdateRankBody = z.infer<typeof updateRankSchema>["body"];
export type RankListQuery = z.infer<typeof rankListQuerySchema>["query"];
export type RankIdParam = z.infer<typeof rankIdParamSchema>["params"];
export type RunTeamEnergyQuery = z.infer<typeof runTeamEnergySchema>["query"];
export type RunCommunityQuery = z.infer<typeof runCommunitySchema>["query"];
export type RunRankCheckQuery = z.infer<typeof runRankCheckSchema>["query"];
export type CompensationSettingsBody = z.infer<typeof compensationSettingsSchema>["body"];