import { api } from "./axios";
import type { P2PTransferPage, WalletType } from "@zeminex/shared";

interface TransferResponse {
  data: { transfer: P2PTransferPage["items"][number] };
}
interface ListResponse {
  data: { transfers: P2PTransferPage };
}

export interface P2PTransferParams {
  wallet?: WalletType;
  page?: number;
  limit?: number;
}

/** POST /p2p — send a P2P wallet transfer. */
export async function sendP2PTransfer(input: {
  wallet: WalletType;
  amount: number;
  referralCode: string;
  memo?: string;
}): Promise<P2PTransferPage["items"][number]> {
  const { data } = await api.post<TransferResponse>("/p2p", input);
  return data.data.transfer;
}

/** GET /p2p — paginated P2P transfer history. */
export async function fetchP2PTransfers(params: P2PTransferParams): Promise<P2PTransferPage> {
  const { data } = await api.get<ListResponse>("/p2p", { params });
  return data.data.transfers;
}