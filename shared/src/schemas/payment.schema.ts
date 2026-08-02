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