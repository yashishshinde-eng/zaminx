import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  fetchAdminDashboard,
  fetchAdminUsers,
  fetchAdminUserDetail,
  setUserStatusRequest,
  verifyUserEmailRequest,
  forceLogoutRequest,
  adminResetPasswordRequest,
  fetchCompensationSettings,
  updateCompensationSettingsRequest,
  fetchSiteConfigAdmin,
  updateSiteConfigAdminRequest,
  fetchSmtpSettings,
  updateSmtpSettingsRequest,
  sendTestEmailRequest,
  fetchNowpaymentsSettings,
  updateNowpaymentsSettingsRequest,
  fetchMaintenanceSettings,
  updateMaintenanceSettingsRequest,
  forceLogoutAllRequest,
  fetchAdminLogs,
  adjustUserWalletRequest,
  type AdminUsersParams,
  type Page,
} from "@/lib/admin";
import { queryKeys } from "@/config";
import type {
  AdminDashboardSummary,
  AdminUserDetail,
  AdminUserReportRow,
  CompensationSettings,
  CompensationSettingsBody,
  SiteConfigUpdate,
  SmtpSettings,
  SmtpSettingsBody,
  NowpaymentsSettings,
  NowpaymentsSettingsBody,
  MaintenanceSettings,
  MaintenanceSettingsBody,
  AdminLogsQuery,
  AdminLogsResult,
  AdminWalletAdjustBody,
  UserStatus,
} from "@zaminex/shared";

/* ------------------------------------------------------------------ */
/*  Reads                                                               */
/* ------------------------------------------------------------------ */

/** Platform-wide admin dashboard (KPIs + series + recent activity). */
export function useAdminDashboard() {
  return useQuery<AdminDashboardSummary>({
    queryKey: queryKeys.adminDashboard,
    queryFn: fetchAdminDashboard,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/** Paginated, searchable admin user list. */
export function useAdminUsers(params: AdminUsersParams) {
  return useQuery<Page<AdminUserReportRow>>({
    queryKey: queryKeys.adminUsers.list(params),
    queryFn: () => fetchAdminUsers(params),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/** Full admin view of a single user. */
export function useAdminUserDetail(id: string | undefined) {
  return useQuery<AdminUserDetail>({
    queryKey: queryKeys.adminUsers.detail(id ?? ""),
    queryFn: () => fetchAdminUserDetail(id as string),
    enabled: Boolean(id),
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/** The 7 compensation knobs. */
export function useCompensationSettings() {
  return useQuery<CompensationSettings>({
    queryKey: queryKeys.compensationSettings,
    queryFn: fetchCompensationSettings,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/* ------------------------------------------------------------------ */
/*  User-management mutations                                           */
/*  After every user mutation, invalidate the list + the user's detail  */
/*  so the row + detail card reflect the new state.                     */
/* ------------------------------------------------------------------ */

function useInvalidateUser(id?: string) {
  const qc = useQueryClient();
  return async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["admin", "users", "list"] }),
      ...(id ? [qc.invalidateQueries({ queryKey: queryKeys.adminUsers.detail(id) })] : []),
    ]);
  };
}

/** PATCH /admin/users/:id/status — suspend / ban / activate. */
export function useSetUserStatus(id?: string) {
  const invalidate = useInvalidateUser(id);
  return useMutation({
    mutationFn: (status: UserStatus) => setUserStatusRequest(id as string, status),
    onSuccess: async () => {
      toast.success("User status updated");
      await invalidate();
    },
    onError: () => {
      /* interceptor toasts (409 self-guard) */
    },
  });
}

/** POST /admin/users/:id/verify-email — manually mark email verified. */
export function useVerifyUserEmail(id?: string) {
  const invalidate = useInvalidateUser(id);
  return useMutation({
    mutationFn: () => verifyUserEmailRequest(id as string),
    onSuccess: async () => {
      toast.success("Email marked verified");
      await invalidate();
    },
    onError: () => {
      /* interceptor toasts */
    },
  });
}

/** POST /admin/users/:id/force-logout — invalidate the user's refresh token. */
export function useForceLogout(id?: string) {
  const invalidate = useInvalidateUser(id);
  return useMutation({
    mutationFn: () => forceLogoutRequest(id as string),
    onSuccess: async () => {
      toast.success("User session ended");
      await invalidate();
    },
    onError: () => {
      /* interceptor toasts (409 self-guard) */
    },
  });
}

/** POST /admin/users/:id/reset-password — admin sets a new password. */
export function useAdminResetPassword(id?: string) {
  const invalidate = useInvalidateUser(id);
  return useMutation({
    mutationFn: (password: string) => adminResetPasswordRequest(id as string, password),
    onSuccess: async () => {
      toast.success("Password reset");
      await invalidate();
    },
    onError: () => {
      /* interceptor toasts */
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Compensation settings mutation                                      */
/* ------------------------------------------------------------------ */

/** PATCH /admin/settings/compensation — update the provided knobs. */
export function useUpdateCompensationSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CompensationSettingsBody) => updateCompensationSettingsRequest(body),
    onSuccess: (compensation) => {
      qc.setQueryData(queryKeys.compensationSettings, compensation);
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Site config + SMTP + NOWPayments settings (Phase 14B)              */
/* ------------------------------------------------------------------ */

/** The 9 admin-editable cms.* fields. */
export function useSiteConfigAdmin() {
  return useQuery<SiteConfigUpdate>({
    queryKey: queryKeys.adminSiteConfig,
    queryFn: fetchSiteConfigAdmin,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/** PATCH /admin/settings/cms — update the provided cms.* fields. */
export function useUpdateSiteConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SiteConfigUpdate) => updateSiteConfigAdminRequest(body),
    onSuccess: (siteConfig) => {
      qc.setQueryData(queryKeys.adminSiteConfig, siteConfig);
    },
  });
}

/** Non-secret SMTP fields + configured flag. */
export function useSmtpSettings() {
  return useQuery<SmtpSettings>({
    queryKey: queryKeys.smtpSettings,
    queryFn: fetchSmtpSettings,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/** PATCH /admin/settings/smtp — update non-secret SMTP fields. */
export function useUpdateSmtpSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SmtpSettingsBody) => updateSmtpSettingsRequest(body),
    onSuccess: (smtp) => {
      qc.setQueryData(queryKeys.smtpSettings, smtp);
    },
  });
}

/** POST /admin/settings/smtp/test — send a test email. */
export function useSendTestEmail() {
  return useMutation({
    mutationFn: (to: string) => sendTestEmailRequest(to),
    onSuccess: (r) => {
      toast.success(r.dev ? "Test email written to the dev folder" : "Test email sent");
    },
    onError: () => {
      /* interceptor toasts the SMTP error */
    },
  });
}

/** Non-secret NOWPayments fields + configured flag. */
export function useNowpaymentsSettings() {
  return useQuery<NowpaymentsSettings>({
    queryKey: queryKeys.nowpaymentsSettings,
    queryFn: fetchNowpaymentsSettings,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/** PATCH /admin/settings/payment — update non-secret NOWPayments fields. */
export function useUpdateNowpaymentsSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NowpaymentsSettingsBody) => updateNowpaymentsSettingsRequest(body),
    onSuccess: (nowpayments) => {
      qc.setQueryData(queryKeys.nowpaymentsSettings, nowpayments);
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Maintenance / force-logout-all / logs (Phase 14C)                  */
/* ------------------------------------------------------------------ */

/** Maintenance flag + message (public setting). */
export function useMaintenanceSettings() {
  return useQuery<MaintenanceSettings>({
    queryKey: queryKeys.adminMaintenance,
    queryFn: fetchMaintenanceSettings,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

/** PATCH /admin/settings/maintenance — toggle maintenance + set message. */
export function useUpdateMaintenanceSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: MaintenanceSettingsBody) => updateMaintenanceSettingsRequest(body),
    onSuccess: (maintenance) => {
      qc.setQueryData(queryKeys.adminMaintenance, maintenance);
    },
  });
}

/** POST /admin/sessions/invalidate-all — force-logout everyone except the admin. */
export function useForceLogoutAll() {
  return useMutation({
    mutationFn: () => forceLogoutAllRequest(),
    onSuccess: (r) => {
      toast.success(`Invalidated ${r.count} session${r.count === 1 ? "" : "s"}`);
    },
    onError: () => {
      /* interceptor toasts */
    },
  });
}

/** GET /admin/logs — tail a Winston log file (always fresh on demand). */
export function useAdminLogs(params: AdminLogsQuery) {
  return useQuery<AdminLogsResult>({
    queryKey: queryKeys.adminLogs(params),
    queryFn: () => fetchAdminLogs(params),
    staleTime: 0,
    gcTime: 60_000,
    retry: 1,
  });
}

/* ------------------------------------------------------------------ */
/*  Admin wallet adjustment (Phase 14C)                                */
/* ------------------------------------------------------------------ */

/** POST /admin/users/:id/wallet/adjust — invalidate the user's detail after. */
export function useAdjustUserWallet(id?: string) {
  const invalidate = useInvalidateUser(id);
  return useMutation({
    mutationFn: (body: AdminWalletAdjustBody) => adjustUserWalletRequest(id as string, body),
    onSuccess: async () => {
      toast.success("Wallet adjusted");
      await invalidate();
    },
    onError: () => {
      /* interceptor toasts (409 insufficient / 404 user) */
    },
  });
}