import { api } from "./axios";
import type { WithdrawalPage, WithdrawalRow, WithdrawalStatus, WalletType } from "@zaminex/shared";

interface ListResponse {
  data: { withdrawals: WithdrawalPage };
}
interface OneResponse {
  data: { withdrawal: WithdrawalRow };
}
interface CreateResponse {
  data: { withdrawal: WithdrawalRow };
}

export interface WithdrawalListParams {
  status?: WithdrawalStatus;
  page?: number;
  limit?: number;
}

/** GET /withdrawals — the user's withdrawals (paginated, filterable). */
export async function fetchWithdrawals(params: WithdrawalListParams): Promise<WithdrawalPage> {
  const { data } = await api.get<ListResponse>("/withdrawals", { params });
  return data.data.withdrawals;
}

/** GET /withdrawals/:id — single withdrawal. */
export async function fetchWithdrawal(id: string): Promise<WithdrawalRow> {
  const { data } = await api.get<OneResponse>(`/withdrawals/${id}`);
  return data.data.withdrawal;
}

/** POST /withdrawals — submit a withdrawal (available → onHold). */
export async function createWithdrawalRequest(input: { wallet: WalletType; amount: number }): Promise<WithdrawalRow> {
  const { data } = await api.post<CreateResponse>("/withdrawals", input);
  return data.data.withdrawal;
}

/** POST /withdrawals/:id/cancel — cancel a pending/under_review withdrawal. */
export async function cancelWithdrawalRequest(id: string): Promise<WithdrawalRow> {
  const { data } = await api.post<OneResponse>(`/withdrawals/${id}/cancel`);
  return data.data.withdrawal;
}