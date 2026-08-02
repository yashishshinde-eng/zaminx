import { User, ActivityLog, UserPackage } from "../models/index.js";
import { ApiError } from "../utils/ApiError.js";
import { logoutUser } from "./auth.service.js";
import { getWalletBalances } from "./wallet.service.js";
import { fetchUsersRows } from "./adminReport.service.js";
import type {
  AdminUserReportRow,
  AdminUserDetail,
  UserStatus,
  AdminUserActivityRow,
} from "@zaminex/shared";

interface ListArgs {
  q?: string;
  status?: UserStatus;
  role?: "user" | "admin";
  page: number;
  limit: number;
}

interface Page<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function paginate<T>(items: T[], total: number, page: number, limit: number): Page<T> {
  return { items, page, limit, total, totalPages: total === 0 ? 0 : Math.ceil(total / limit) };
}

function toIso(d: Date | string | null | undefined): string {
  if (d instanceof Date) return d.toISOString();
  if (typeof d === "string") return d;
  return new Date().toISOString();
}

/** GET /admin/users — paginated, searchable, filterable admin user list. */
export async function listAdminUsers(args: ListArgs): Promise<Page<AdminUserReportRow>> {
  const page = Math.max(1, args.page);
  const limit = Math.min(50, Math.max(1, args.limit));
  const filter: Record<string, unknown> = {};
  if (args.status) filter.status = args.status;
  if (args.role) filter.role = args.role;
  if (args.q) {
    filter.$or = [
      { name: { $regex: args.q, $options: "i" } },
      { email: { $regex: args.q, $options: "i" } },
      { referralCode: { $regex: args.q, $options: "i" } },
    ];
  }
  const [items, total] = await Promise.all([
    fetchUsersRows(filter, limit, (page - 1) * limit),
    User.countDocuments(filter),
  ]);
  return paginate(items, total, page, limit);
}

type LeanDetail = {
  _id: { toString(): string };
  name: string;
  email: string;
  phone?: string;
  role: string;
  status: string;
  referralCode: string;
  referredBy?: string | null;
  sponsorId?: { toString(): string } | null;
  isEmailVerified: boolean;
  walletAddresses?: { usdtBep20?: string } | null;
  notificationPreference?: { email?: boolean; dashboard?: boolean } | null;
  createdAt: Date | string;
  lastLoginAt?: Date | null;
};

/** GET /admin/users/:id — full admin view of a single user. */
export async function getAdminUserDetail(id: string): Promise<AdminUserDetail> {
  const user = (await User.findById(id).lean()) as LeanDetail | null;
  if (!user) throw ApiError.notFound("User not found");

  const [walletBalances, activePkg, directCount, logs] = await Promise.all([
    getWalletBalances(id),
    UserPackage.findOne({ user: id, status: "active" }).sort({ activatedAt: -1 }).lean(),
    User.countDocuments({ sponsorId: id }),
    ActivityLog.find({ actor: id }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  const recentActivity: AdminUserActivityRow[] = logs.map((l) => ({
    id: l._id.toString(),
    action: l.action,
    resource: l.resource ?? null,
    resourceId: l.resourceId ?? null,
    createdAt: l.createdAt instanceof Date ? l.createdAt.toISOString() : new Date(l.createdAt).toISOString(),
  }));

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role as AdminUserDetail["role"],
    status: user.status as UserStatus,
    referralCode: user.referralCode,
    referredBy: user.referredBy ?? null,
    sponsorId: user.sponsorId ? user.sponsorId.toString() : null,
    isEmailVerified: user.isEmailVerified,
    walletAddresses: { usdtBep20: user.walletAddresses?.usdtBep20 ?? "" },
    notificationPreference: {
      email: user.notificationPreference?.email ?? true,
      dashboard: user.notificationPreference?.dashboard ?? true,
    },
    directCount,
    walletBalances,
    activePackage: activePkg
      ? {
          name: activePkg.snapshot?.name ?? "Package",
          activatedAt: toIso(activePkg.activatedAt),
          expiresAt: toIso(activePkg.expiresAt),
        }
      : null,
    joinedAt: toIso(user.createdAt),
    lastLoginAt: user.lastLoginAt == null ? null : toIso(user.lastLoginAt),
    recentActivity,
  };
}

/** PATCH /admin/users/:id/status — suspend / ban / activate (admin). */
export async function setUserStatus(adminId: string, id: string, status: UserStatus): Promise<void> {
  if (id === adminId) throw ApiError.conflict("You cannot change your own status");
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound("User not found");
  const from = user.status;
  if (from === status) return; // idempotent
  user.status = status;
  // A suspended/banned user cannot hold a live session.
  if (status !== "active") user.refreshTokenHash = null;
  await user.save();
  await ActivityLog.create({
    actor: adminId,
    action: "user.status_change",
    resource: "User",
    resourceId: id,
    meta: { from, to: status },
  }).catch(() => undefined);
}

/** POST /admin/users/:id/verify-email — manually mark email verified (admin). */
export async function verifyUserEmail(adminId: string, id: string): Promise<void> {
  const user = await User.findById(id).select("+emailVerifyTokenHash +emailVerifyTokenExpires");
  if (!user) throw ApiError.notFound("User not found");
  if (user.isEmailVerified) return; // idempotent
  user.isEmailVerified = true;
  user.emailVerifyTokenHash = null;
  user.emailVerifyTokenExpires = null;
  await user.save();
  await ActivityLog.create({
    actor: adminId,
    action: "user.email_verified",
    resource: "User",
    resourceId: id,
  }).catch(() => undefined);
}

/** POST /admin/users/:id/force-logout — invalidate the user's refresh token (admin). */
export async function forceLogoutUser(adminId: string, id: string): Promise<void> {
  if (id === adminId) throw ApiError.conflict("Cannot force-logout yourself");
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound("User not found");
  await logoutUser(id);
  await ActivityLog.create({
    actor: adminId,
    action: "user.force_logout",
    resource: "User",
    resourceId: id,
  }).catch(() => undefined);
}

/** POST /admin/users/:id/reset-password — admin sets a new password (rehashes). */
export async function adminResetPassword(adminId: string, id: string, password: string): Promise<void> {
  const user = await User.findById(id).select("+resetTokenHash +resetTokenExpires");
  if (!user) throw ApiError.notFound("User not found");
  user.password = password; // virtual rehashes via bcrypt
  user.resetTokenHash = null;
  user.resetTokenExpires = null;
  user.refreshTokenHash = null; // force re-login everywhere
  await user.save();
  await ActivityLog.create({
    actor: adminId,
    action: "user.password_reset",
    resource: "User",
    resourceId: id,
  }).catch(() => undefined);
}