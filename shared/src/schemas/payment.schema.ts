import { z } from "zod";

/**
 * Payment/deposit schemas — Phase 15 input-validation coverage.
 * (NOWPayments webhook bodies are intentionally not schema-validated here:
 * they are HMAC-verified server-to-server payloads with narrow field reads.)
 */

/** Path param for /payments/deposits/:id. */
export const depositIdParamSchema = z.object({
  params: z.object({ id: z.string().trim().min(1, "Deposit id is required") }),
});

export type DepositIdParam = z.infer<typeof depositIdParamSchema>["params"];

/**
 * POST /payments/deposit — start a wallet deposit (decoupled from any package).
 * The user picks an amount, we create a pending package-less Deposit + a
 * NOWPayments invoice, and the webhook credits their Main wallet on confirm.
 */
export const createDepositSchema = z.object({
  body: z.object({
    /** USD amount to deposit. Floor of $1 keeps the invoice meaningful; a sane
     *  ceiling guards against fat-fingered inputs. */
    amount: z
      .number({ required_error: "Amount is required", invalid_type_error: "Amount must be a number" })
      .min(1, "Minimum deposit is $1")
      .max(100_000, "Maximum deposit is $100,000"),
  }),
});

export type CreateDepositBody = z.infer<typeof createDepositSchema>["body"];