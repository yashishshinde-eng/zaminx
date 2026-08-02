import { z } from "zod";

/** GET /wallet/ledger — paginated, filterable wallet ledger history. */
export const walletLedgerQuerySchema = z.object({
  query: z.object({
    wallet: z.enum(["main", "bonus", "trading"]).optional(),
    type: z.string().trim().optional(),
    q: z.string().trim().max(60).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

export type WalletLedgerQuery = z.infer<typeof walletLedgerQuerySchema>["query"];