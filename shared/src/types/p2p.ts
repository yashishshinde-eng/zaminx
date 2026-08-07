import type { WalletType } from "./wallet";

/**
 * P2P wallet-to-wallet transfers. A user sends funds from their wallet
 * to another user's wallet using the recipient's referral code.
 *
 * Lifecycle: `completed` on success, `failed` only if an unrecoverable
 * error occurs after partial execution (extremely rare — the service
 * rolls back the debit if the credit cannot be applied).
 */

export type P2PTransferStatus = "completed" | "failed";

/** A P2P transfer row, as returned over the API. */
export interface P2PTransferRow {
  id: string;
  fromUser: string;
  fromUserName: string;
  toUser: string;
  toUserName: string;
  wallet: WalletType;
  amount: number;
  status: P2PTransferStatus;
  memo: string | null;
  createdAt: string;
}

/** A paginated page of P2P transfers. */
export interface P2PTransferPage {
  items: P2PTransferRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}