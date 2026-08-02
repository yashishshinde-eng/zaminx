import { api } from "./axios";
import type { BonanzaOverview } from "@zaminex/shared";

interface OverviewResponse {
  data: { bonanzas: BonanzaOverview };
}

/** GET /bonanzas — the viewer's direct count + active offers with progress. */
export async function fetchBonanzaOverview(): Promise<BonanzaOverview> {
  const { data } = await api.get<OverviewResponse>("/bonanzas");
  return data.data.bonanzas;
}