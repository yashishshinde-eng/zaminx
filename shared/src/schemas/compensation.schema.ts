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

export type CreateBonanzaBody = z.infer<typeof createBonanzaSchema>["body"];
export type UpdateBonanzaBody = z.infer<typeof updateBonanzaSchema>["body"];
export type BonanzaListQuery = z.infer<typeof bonanzaListQuerySchema>["query"];
export type RunYieldQuery = z.infer<typeof runYieldSchema>["query"];
export type EvaluateBonanzaQuery = z.infer<typeof evaluateBonanzaSchema>["query"];