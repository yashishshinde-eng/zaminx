import { z } from "zod";

/**
 * Admin user-management schemas — Phase 14A.
 *
 * The admin Users list reuses the joined `AdminUserReportRow` (direct count +
 * wallet sums) produced by `adminReport.service.fetchUsersRows`; these
 * schemas cover the list query + the per-user admin actions (status change,
 * manual email verify, force-logout, admin reset-password).
 */

const USER_STATUSES = ["active", "inactive", "blocked"] as const;
const USER_ROLES = ["user", "admin"] as const;

/** GET /admin/users — paginated, searchable, filterable admin user list. */
export const adminUserListQuerySchema = z.object({
  query: z.object({
    q: z.string().trim().max(60).optional(),
    status: z.enum(USER_STATUSES).optional(),
    role: z.enum(USER_ROLES).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

/** Path param shared by every per-user admin action. */
export const adminUserIdParamSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1, "User id is required"),
  }),
});

/** PATCH /admin/users/:id/status — suspend / ban / activate. */
export const adminUserStatusSchema = z.object({
  body: z.object({
    status: z.enum(USER_STATUSES),
  }),
});

/** POST /admin/users/:id/reset-password — admin sets a new password. */
export const adminResetPasswordSchema = z.object({
  body: z.object({
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
  }),
});

export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>["query"];
export type AdminUserIdParam = z.infer<typeof adminUserIdParamSchema>["params"];
export type AdminUserStatusBody = z.infer<typeof adminUserStatusSchema>["body"];
export type AdminResetPasswordBody = z.infer<typeof adminResetPasswordSchema>["body"];