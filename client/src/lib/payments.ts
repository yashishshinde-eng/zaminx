import { api } from "./axios";
import type { DepositRow } from "@zeminex/shared";

interface DepositsResponse {
  data: { deposits: DepositRow[] };
}
interface OneDepositResponse {
  data: { deposit: DepositRow | null };
}
interface CreateDepositResponse {
  data: { deposit: DepositRow };
}

/** GET /payments/deposits — the user's deposits. */
export async function fetchDeposits(): Promise<DepositRow[]> {
  const { data } = await api.get<DepositsResponse>("/payments/deposits");
  return data.data.deposits;
}

/** GET /payments/deposits/:id — single deposit status. */
export async function fetchDeposit(id: string): Promise<DepositRow | null> {
  const { data } = await api.get<OneDepositResponse>(`/payments/deposits/${id}`);
  return data.data.deposit;
}

/** POST /payments/deposit — start a wallet deposit (amount → NOWPayments invoice). */
export async function createDepositRequest(amount: number): Promise<DepositRow> {
  const { data } = await api.post<CreateDepositResponse>("/payments/deposit", { amount });
  return data.data.deposit;
}

/** POST /payments/dev/simulate/:id — simulate a paid sandbox deposit (dev only). */
export async function simulatePaymentRequest(depositId: string): Promise<DepositRow | null> {
  const { data } = await api.post<OneDepositResponse>(`/payments/dev/simulate/${depositId}`);
  return data.data.deposit;
}