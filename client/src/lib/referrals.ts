import { api } from "./axios";
import type { ReferralPage, ReferralStats, ReferralMemberStatus } from "@zeminex/shared";

interface StatsResponse {
  data: { referral: ReferralStats };
}
interface PageResponse {
  data: { direct: ReferralPage };
}
interface TeamResponse {
  data: { team: ReferralPage };
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

export interface ReferralTeamParams {
  /** Relative level (1 = direct, 2 = second level…); omitted = all levels. */
  level?: number;
  /** `inactive` matches inactive OR blocked (any non-active member). */
  status?: "active" | "inactive";
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

/** GET /referrals/team — the viewer's full downline (all levels), filterable. */
export async function fetchTeamReferrals(params: ReferralTeamParams): Promise<ReferralPage> {
  const { data } = await api.get<TeamResponse>("/referrals/team", { params });
  return data.data.team;
}

export interface ReferralCodeCheck {
  valid: boolean;
  name?: string;
}

interface ValidateResponse {
  data: ReferralCodeCheck;
}

/**
 * GET /referrals/validate?code= — public pre-submit check that a referral code
 * belongs to an active sponsor. Used by the register form to show a "verified"
 * affordance for both link-prefilled and manually-entered codes.
 */
export async function checkReferralCode(code: string): Promise<ReferralCodeCheck> {
  const { data } = await api.get<ValidateResponse>("/referrals/validate", { params: { code } });
  return data.data;
}

/** GET /referrals/children/:userId — lazy tree expansion (userId = "me" or an id). */
export async function fetchTreeChildren(userId: string, params: ReferralChildrenParams): Promise<ReferralPage> {
  const { data } = await api.get<ChildrenResponse>(`/referrals/children/${userId}`, { params });
  return data.data.children;
}