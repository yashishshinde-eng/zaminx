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

/* ----------------------------------------------------------------------------
 * Admin wallet adjustment (Phase 14C). Credits/debits a wallet balance field
 * via an immutable `adjustment` ledger row. Debits cannot go negative (guarded
 * server-side). `memo` is the admin's reason note.
 * ------------------------------------------------------------------------- */

export const adminWalletAdjustSchema = z.object({
  body: z.object({
    wallet: z.enum(["main", "bonus", "trading"]),
    field: z.enum(["available", "onHold"]).default("available"),
    direction: z.enum(["credit", "debit"]),
    amount: z.number().positive(),
    memo: z.string().max(280).optional(),
  }),
});

/* ----------------------------------------------------------------------------
 * Admin deposit (manual). Records a paid, package-less `Deposit` for a user
 * and credits their Main/available wallet as a `deposit` ledger row (not an
 * `adjustment`). The optional `memo` is the admin's reference / tx hash / note.
 * ------------------------------------------------------------------------- */

export const adminDepositCreateSchema = z.object({
  body: z.object({
    amount: z.number().positive("Amount must be positive"),
    memo: z.string().trim().max(280).optional(),
  }),
});