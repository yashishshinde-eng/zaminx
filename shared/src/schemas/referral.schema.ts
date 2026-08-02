import { z } from "zod";

/** GET /referrals/direct — paginated, filterable direct referrals. */
export const referralListQuerySchema = z.object({
  query: z.object({
    status: z.enum(["active", "suspended", "banned"]).optional(),
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

/** Path param for /referrals/children/:userId (`userId` may be "me"). */
export const referralUserIdParamSchema = z.object({
  params: z.object({
    userId: z.string().trim().min(1, "Node id is required"),
  }),
});

export type ReferralListQuery = z.infer<typeof referralListQuerySchema>["query"];
export type ReferralChildrenQuery = z.infer<typeof referralChildrenQuerySchema>["query"];
export type ReferralUserIdParam = z.infer<typeof referralUserIdParamSchema>["params"];