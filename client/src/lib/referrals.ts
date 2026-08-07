import { api } from "./axios";
import type { ReferralPage, ReferralStats, ReferralMemberStatus } from "@zeminex/shared";

interface StatsResponse {
  data: { referral: ReferralStats };
}
interface PageResponse {
  data: { direct: ReferralPage };
}
interface ChildrenResponse {
  data: { children: ReferralPage };
}

export interface ReferralListParams {
  status?: ReferralMemberStatus;
  q?: string;
  page?: number;
  limit?: number;
}

export interface ReferralChildrenParams {
  page?: number;
  limit?: number;
}

/** GET /referrals/me — referral code/link + team statistics. */
export async function fetchReferralStats(): Promise<ReferralStats> {
  const { data } = await api.get<StatsResponse>("/referrals/me");
  return data.data.referral;
}

/** GET /referrals/direct — the viewer's level-1 referrals (paginated). */
export async function fetchDirectReferrals(params: ReferralListParams): Promise<ReferralPage> {
  const { data } = await api.get<PageResponse>("/referrals/direct", { params });
  return data.data.direct;
}

/** GET /referrals/children/:userId — lazy tree expansion (userId = "me" or an id). */
export async function fetchTreeChildren(userId: string, params: ReferralChildrenParams): Promise<ReferralPage> {
  const { data } = await api.get<ChildrenResponse>(`/referrals/children/${userId}`, { params });
  return data.data.children;
}