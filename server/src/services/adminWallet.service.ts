import { randomUUID } from "node:crypto";
import { ActivityLog } from "../models/index.js";
import { applyLedgerEntry } from "./wallet.service.js";
import type { AdminWalletAdjustBody, WalletBalance } from "@zaminex/shared";

export interface AdminAdjustResult {
  wallet: AdminWalletAdjustBody["wallet"];
  balance: WalletBalance;
}

/**
 * POST /admin/users/:id/wallet/adjust (Phase 14C). Apply an admin credit/debit
 * to one of a user's wallet balance fields via an immutable `adjustment` ledger
 * row. A random `reference.resourceId` sidesteps the ledger's idempotency guard
 * so the same admin can make repeated adjustments. Debits that would go negative
 * rethrow the `Insufficient balance` conflict (no overdraft).
 */
export async function adminAdjustWallet(
  adminId: string,
  userId: string,
  body: AdminWalletAdjustBody,
): Promise<AdminAdjustResult> {
  const result = await applyLedgerEntry({
    userId,
    wallet: body.wallet,
    field: body.field,
    direction: body.direction,
    amount: body.amount,
    type: "adjustment",
    reference: { resource: "admin_adjustment", resourceId: randomUUID() },
    memo: body.memo ?? null,
    meta: { adminId, reason: body.memo ?? null },
  });

  await ActivityLog.create({
    actor: adminId,
    action: "wallet.adjust",
    resource: "Wallet",
    resourceId: userId,
    meta: { wallet: body.wallet, field: body.field, direction: body.direction, amount: body.amount },
  }).catch(() => undefined);

  return { wallet: result.wallet, balance: result.balance };
}