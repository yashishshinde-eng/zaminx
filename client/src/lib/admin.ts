import { api } from "./axios";
import type {
  AdminDashboardSummary,
  AdminUserDetail,
  AdminUserReportRow,
  CompensationSettings,
  CompensationSettingsBody,
  UserStatus,
} from "@zaminex/shared";

/** A paginated page of rows (matches every list endpoint in this module). */
export interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Admin user-list query params (q / status / role / page / limit). */
export interface AdminUsersParams {
  q?: string;
  status?: UserStatus;
  role?: "user" | "admin";
  page?: number;
  limit?: number;
}

interface DashboardResponse {
  data: { dashboard: AdminDashboardSummary };
}
interface UsersResponse {
  data: { users: Page<AdminUserReportRow> };
}
interface UserResponse {
  data: { user: AdminUserDetail };
}
interface CompensationResponse {
  data: { compensation: CompensationSettings };
}

/* ------------------------------------------------------------------ */
/*  Admin dashboard + user management (Phase 14A)                      */
/* ------------------------------------------------------------------ */

/** GET /admin/dashboard — platform-wide KPIs + 30-day series + recent activity. */
export async function fetchAdminDashboard(): Promise<AdminDashboardSummary> {
  const { data } = await api.get<DashboardResponse>("/admin/dashboard");
  return data.data.dashboard;
}

/** GET /admin/users — paginated, searchable, filterable admin user list. */
export async function fetchAdminUsers(params: AdminUsersParams): Promise<Page<AdminUserReportRow>> {
  const { data } = await api.get<UsersResponse>("/admin/users", { params });
  return data.data.users;
}

/** GET /admin/users/:id — full admin view of a single user. */
export async function fetchAdminUserDetail(id: string): Promise<AdminUserDetail> {
  const { data } = await api.get<UserResponse>(`/admin/users/${id}`);
  return data.data.user;
}

/** PATCH /admin/users/:id/status — suspend / ban / activate. */
export async function setUserStatusRequest(id: string, status: UserStatus): Promise<void> {
  await api.patch(`/admin/users/${id}/status`, { status });
}

/** POST /admin/users/:id/verify-email — manually mark a user's email verified. */
export async function verifyUserEmailRequest(id: string): Promise<void> {
  await api.post(`/admin/users/${id}/verify-email`);
}

/** POST /admin/users/:id/force-logout — invalidate the user's refresh token. */
export async function forceLogoutRequest(id: string): Promise<void> {
  await api.post(`/admin/users/${id}/force-logout`);
}

/** POST /admin/users/:id/reset-password — admin sets a new password for a user. */
export async function adminResetPasswordRequest(id: string, password: string): Promise<void> {
  await api.post(`/admin/users/${id}/reset-password`, { password });
}

/* ------------------------------------------------------------------ */
/*  Compensation settings (Phase 14A)                                   */
/* ------------------------------------------------------------------ */

/** GET /admin/settings/compensation — read the 7 compensation knobs. */
export async function fetchCompensationSettings(): Promise<CompensationSettings> {
  const { data } = await api.get<CompensationResponse>("/admin/settings/compensation");
  return data.data.compensation;
}

/** PATCH /admin/settings/compensation — update the provided knobs. */
export async function updateCompensationSettingsRequest(body: CompensationSettingsBody): Promise<CompensationSettings> {
  const { data } = await api.patch<CompensationResponse>("/admin/settings/compensation", body);
  return data.data.compensation;
}

/* ------------------------------------------------------------------ */
/*  Compensation engine triggers (existing endpoints, surfaced in UI)  */
/* ------------------------------------------------------------------ */

export interface TriggerResult {
  [key: string]: unknown;
}

/** POST /compensation/run-yield — daily trade-yield run (optional `date` YYYY-MM-DD). */
export async function runYieldTrigger(date?: string): Promise<TriggerResult> {
  const { data } = await api.post<{ data: { yield: TriggerResult } }>("/compensation/run-yield", null, { params: { date } });
  return data.data.yield;
}

/** POST /compensation/run-team-energy — daily team-energy run (optional `date`). */
export async function runTeamEnergyTrigger(date?: string): Promise<TriggerResult> {
  const { data } = await api.post<{ data: { teamEnergy: TriggerResult } }>("/compensation/run-team-energy", null, { params: { date } });
  return data.data.teamEnergy;
}

/** POST /compensation/run-community — monthly community-bonus run (optional `month` YYYY-MM). */
export async function runCommunityTrigger(month?: string): Promise<TriggerResult> {
  const { data } = await api.post<{ data: { community: TriggerResult } }>("/compensation/run-community", null, { params: { month } });
  return data.data.community;
}

/** POST /compensation/evaluate-bonanzas — evaluate bonanzas (optional `userId`). */
export async function evaluateBonanzasTrigger(userId?: string): Promise<TriggerResult> {
  const { data } = await api.post<{ data: { bonanza: TriggerResult } }>("/compensation/evaluate-bonanzas", null, { params: { userId } });
  return data.data.bonanza;
}

/** POST /compensation/run-rank-check — rank evaluation (optional `userId`). */
export async function runRankCheckTrigger(userId?: string): Promise<TriggerResult> {
  const { data } = await api.post<{ data: { rank: TriggerResult } }>("/compensation/run-rank-check", null, { params: { userId } });
  return data.data.rank;
}