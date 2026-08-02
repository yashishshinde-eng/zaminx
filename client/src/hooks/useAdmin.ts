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