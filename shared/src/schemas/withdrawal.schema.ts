import { z } from "zod";

const STATUSES = ["pending", "under_review", "approved", "rejected", "paid", "cancelled"] as const;

/** POST /withdrawals — submit a withdrawal request (USDT-BEP20, manual approval). */
export const createWithdrawalSchema = z.object({
  body: z.object({
    wallet: z.enum(["bonus", "trading"]),
    amount: z.number().positive("Amount must be greater than 0"),
  }),
});

/** GET /withdrawals (and /withdrawals/admin) — paginated, filterable list. */
export const withdrawalListQuerySchema = z.object({
  query: z.object({
    status: z.enum(STATUSES).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

/** POST /withdrawals/admin/:id/{review,approve,reject,pay} — admin action. */
export const adminActionSchema = z.object({
  body: z.object({
    remarks: z.string().trim().max(500).optional(),
  }),
});

/** Path param for /withdrawals/:id* (user + admin). */
export const withdrawalIdParamSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1, "Withdrawal id is required"),
  }),
});

export type CreateWithdrawalBody = z.infer<typeof createWithdrawalSchema>["body"];
export type WithdrawalListQuery = z.infer<typeof withdrawalListQuerySchema>["query"];
export type AdminActionBody = z.infer<typeof adminActionSchema>["body"];
export type WithdrawalIdParam = z.infer<typeof withdrawalIdParamSchema>["params"];