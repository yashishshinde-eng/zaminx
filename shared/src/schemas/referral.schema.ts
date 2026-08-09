import { z } from "zod";

/** GET /referrals/direct — paginated, filterable direct referrals. */
export const referralListQuerySchema = z.object({
  query: z.object({
    status: z.enum(["active", "inactive", "blocked"]).optional(),
    q: z.string().trim().max(60).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

/** GET /referrals/children/:userId — lazy tree expansion (paginated). */
export const referralChildrenQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

/**
 * GET /referrals/team — the viewer's full downline (all levels), filterable by
 * level and status. `level` is relative to the viewer (1 = direct, 2 = second
 * level…); omitted = all levels. `status: "inactive"` is a virtual bucket
 * matching inactive OR blocked (i.e. any non-active member).
 */
export const referralTeamQuerySchema = z.object({
  query: z.object({
    level: z.coerce.number().int().min(1).optional(),
    status: z.enum(["active", "inactive"]).optional(),
    q: z.string().trim().max(60).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

/** Path param for /referrals/children/:userId (`userId` may be "me"). */
export const referralUserIdParamSchema = z.object({
  params: z.object({
    userId: z.string().trim().min(1, "Node id is required"),
  }),
});

/**
 * GET /referrals/validate?code= — public lookup used by the register form to
 * confirm a referral code belongs to an active sponsor *before* submit. No auth:
 * prospective members aren't logged in. Returns `{ valid, name? }` only — no PII
 * beyond the sponsor's display name (already exposed on downline rows).
 */
export const referralValidateQuerySchema = z.object({
  query: z.object({
    code: z.string().trim().min(1, { message: "Referral code is required" }).max(50, { message: "Referral code is too long" }),
  }),
});

export type ReferralListQuery = z.infer<typeof referralListQuerySchema>["query"];
export type ReferralChildrenQuery = z.infer<typeof referralChildrenQuerySchema>["query"];
export type ReferralTeamQuery = z.infer<typeof referralTeamQuerySchema>["query"];
export type ReferralValidateQuery = z.infer<typeof referralValidateQuerySchema>["query"];
export type ReferralUserIdParam = z.infer<typeof referralUserIdParamSchema>["params"];