import { api } from "./axios";
import type { DashboardSummary } from "@zaminex/shared";

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await api.get<{ data: DashboardSummary }>("/dashboard/summary");
  return data.data;
}