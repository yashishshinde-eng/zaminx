import { api } from "./axios";
import type { WalletBalances, WalletLedgerPage, WalletType } from "@zeminex/shared";

interface WalletResponse {
  data: { wallets: WalletBalances };
}
interface LedgerResponse {
  data: { ledger: WalletLedgerPage };
}

export interface WalletLedgerParams {
  wallet?: WalletType;
  type?: string;
  q?: string;
  page?: number;
  limit?: number;
}

/** GET /wallet — the user's three wallet balances + totals. */
export async function fetchWallet(): Promise<WalletBalances> {
  const { data } = await api.get<WalletResponse>("/wallet");
  return data.data.wallets;
}

/** GET /wallet/ledger — paginated, filterable wallet transaction history. */
export async function fetchWalletLedger(params: WalletLedgerParams): Promise<WalletLedgerPage> {
  const { data } = await api.get<LedgerResponse>("/wallet/ledger", { params });
  return data.data.ledger;
}