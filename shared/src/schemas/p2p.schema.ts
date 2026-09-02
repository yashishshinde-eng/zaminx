import { z } from "zod";

/** POST /p2p — send a P2P transfer to another user's wallet. */
export const createP2PTransferSchema = z.object({
  body: z.object({
    wallet: z.enum(["main", "bonus", "trading"]),
    amount: z.number().positive("Amount must be greater than 0"),
    referralCode: z
      .string()
      .trim()
      .min(1, "Referral code is required")
      .max(50, "Referral code is too long"),
    memo: z.string().trim().max(200).optional(),
    // 4-digit transaction PIN — authorises the transfer.
    transactionPassword: z
      .string()
      .trim()
      .length(4, { message: "Transaction PIN must be exactly 4 digits" })
      .regex(/^\d{4}$/, { message: "Transaction PIN must be exactly 4 digits" }),
  }),
});

/** GET /p2p — paginated, filterable transfer history. */
export const p2pTransferListQuerySchema = z.object({
  query: z.object({
    wallet: z.enum(["main", "bonus", "trading"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

export type CreateP2PTransferBody = z.infer<typeof createP2PTransferSchema>["body"];
export type P2PTransferListQuery = z.infer<typeof p2pTransferListQuerySchema>["query"];