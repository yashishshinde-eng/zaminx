import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ShieldCheck, MailCheck, LogOut, KeyRound } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, DataTable, type Column } from "@/components/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmModal } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAdminUserDetail, useSetUserStatus, useVerifyUserEmail, useForceLogout, useAdminResetPassword } from "@/hooks/useAdmin";
import { userStatusBadge } from "@/pages/AdminUsersPage";
import type { AdminUserActivityRow, AdminUserDetail, UserStatus } from "@zaminex/shared";

const STATUSES: UserStatus[] = ["active", "suspended", "banned"];

/** /app/admin/users/:id — full admin view of a single user + management actions. */
export function AdminUserDetailPage() {
  const { id = "" } = useParams();
  const { data: user, isLoading, isError, refetch } = useAdminUserDetail(id);

  if (isLoading) {
    return (
      <AppShell>
        <PageHeader title="User" breadcrumbs={[{ label: "Admin", to: "/app/admin" }, { label: "Users", to: "/app/admin/users" }, { label: "Detail" }]} />
        <div className="mt-6 space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppShell>
    );
  }

  if (isError || !user) {
    return (
      <AppShell>
        <PageHeader title="User not found" breadcrumbs={[{ label: "Admin", to: "/app/admin" }, { label: "Users", to: "/app/admin/users" }, { label: "Detail" }]} />
        <div className="mt-6">
          <Button asChild variant="outline" size="sm">
            <Link to="/app/admin/users">
              <ArrowLeft className="size-4" /> Back to users
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title={user.name}
        description={user.email}
        breadcrumbs={[{ label: "Admin", to: "/app/admin" }, { label: "Users", to: "/app/admin/users" }, { label: user.name }]}
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Profile + wallets + package (spans 2) */}
        <div className="space-y-6 lg:col-span-2">
          <ProfileCard user={user} />
          <WalletsCard user={user} />
          <PackageCard user={user} />
          <ActivityCard activity={user.recentActivity} onRetry={refetch} />
        </div>

        {/* Action panel */}
        <div className="space-y-6">
          <ActionsPanel userId={user.id} currentStatus={user.status} isEmailVerified={user.isEmailVerified} />
        </div>
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Profile                                                              */
/* ------------------------------------------------------------------ */

function ProfileCard({ user }: { user: AdminUserDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Profile</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <Field label="User ID" value={<span className="font-mono text-xs">{user.id}</span>} />
        <Field label="Status" value={userStatusBadge(user.status)} />
        <Field label="Role" value={<span className="capitalize">{user.role}</span>} />
        <Field label="Email verified" value={user.isEmailVerified ? <Badge variant="success">Yes</Badge> : <Badge variant="secondary">No</Badge>} />
        <Field label="Referral code" value={<span className="font-mono text-xs">{user.referralCode}</span>} />
        <Field label="Referred by" value={user.referredBy ? <span className="font-mono text-xs">{user.referredBy}</span> : "—"} />
        <Field label="Phone" value={user.phone ?? "—"} />
        <Field label="Direct referrals" value={String(user.directCount)} />
        <Field label="Wallet address (USDT-BEP20)" value={user.walletAddresses.usdtBep20 ? <span className="font-mono text-xs">{user.walletAddresses.usdtBep20}</span> : "—"} />
        <Field label="Joined" value={formatDate(user.joinedAt)} />
        <Field label="Last login" value={formatDate(user.lastLoginAt)} />
        <Field
          label="Notifications"
          value={
            <span className="text-xs">
              email {user.notificationPreference.email ? "✓" : "✗"} · dashboard {user.notificationPreference.dashboard ? "✓" : "✗"}
            </span>
          }
        />
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm">{value}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Wallets                                                              */
/* ------------------------------------------------------------------ */

function WalletsCard({ user }: { user: AdminUserDetail }) {
  const w = user.walletBalances;
  const rows = [
    { name: "Main", available: w.main.available, onHold: w.main.onHold },
    { name: "Trading", available: w.trading.available, onHold: w.trading.onHold },
    { name: "Bonus", available: w.bonus.available, onHold: w.bonus.onHold },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Wallet balances</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Total available" value={formatCurrency(w.totalAvailable)} />
          <Stat label="Total on hold" value={formatCurrency(w.totalOnHold)} />
          <Stat label="Total" value={formatCurrency(w.total)} />
        </div>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-muted-foreground">Wallet</th>
                <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Available</th>
                <th className="px-4 py-2 text-right font-semibold text-muted-foreground">On hold</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className="border-b last:border-0">
                  <td className="px-4 py-2">{r.name}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(r.available)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(r.onHold)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Active package                                                       */
/* ------------------------------------------------------------------ */

function PackageCard({ user }: { user: AdminUserDetail }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Active package</CardTitle>
      </CardHeader>
      <CardContent>
        {user.activePackage ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Package" value={user.activePackage.name} />
            <Field label="Activated" value={formatDate(user.activePackage.activatedAt)} />
            <Field label="Expires" value={formatDate(user.activePackage.expiresAt)} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No active package.</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Recent activity                                                       */
/* ------------------------------------------------------------------ */

const activityColumns: Column<AdminUserActivityRow>[] = [
  { key: "createdAt", header: "When", cell: (r) => formatDate(r.createdAt) },
  { key: "action", header: "Action", cell: (r) => <span className="font-mono text-xs">{r.action}</span> },
  { key: "resource", header: "Resource", cell: (r) => (r.resource ?? "—") },
];

function ActivityCard({ activity, onRetry }: { activity: AdminUserActivityRow[]; onRetry: () => void }) {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Recent activity</CardTitle>
        <CardDescription>The 10 most recent audit-log entries for this user.</CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={activityColumns}
          data={activity}
          rowKey={(r) => r.id}
          emptyTitle="No recent activity"
          emptyDescription="This user has no audit events yet."
          error={null}
          onRetry={onRetry}
        />
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Action panel                                                          */
/* ------------------------------------------------------------------ */

function ActionsPanel({ userId, currentStatus, isEmailVerified }: { userId: string; currentStatus: UserStatus; isEmailVerified: boolean }) {
  const [status, setStatus] = useState<UserStatus>(currentStatus);
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  const setStatusMut = useSetUserStatus(userId);
  const verifyMut = useVerifyUserEmail(userId);
  const logoutMut = useForceLogout(userId);
  const resetMut = useAdminResetPassword(userId);

  const statusChanged = status !== currentStatus;

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="size-4 text-primary" /> Manage user
        </CardTitle>
        <CardDescription>Suspend, verify, force-logout, or reset this user's password.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status">Account status</Label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as UserStatus)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s}
              </option>
            ))}
          </select>
          <Button
            className="w-full"
            disabled={!statusChanged || setStatusMut.isPending}
            onClick={() => setConfirmStatus(true)}
          >
            {setStatusMut.isPending ? "Saving…" : "Save status"}
          </Button>
        </div>

        {/* Verify email */}
        <div className="space-y-2">
          <Label>Email verification</Label>
          <Button
            variant="outline"
            className="w-full"
            disabled={isEmailVerified || verifyMut.isPending}
            onClick={() => verifyMut.mutate()}
          >
            <MailCheck className="size-4" /> {isEmailVerified ? "Already verified" : verifyMut.isPending ? "Verifying…" : "Mark email verified"}
          </Button>
        </div>

        {/* Force logout */}
        <div className="space-y-2">
          <Label>Session</Label>
          <Button
            variant="outline"
            className="w-full"
            disabled={logoutMut.isPending}
            onClick={() => setConfirmLogout(true)}
          >
            <LogOut className="size-4" /> {logoutMut.isPending ? "Ending…" : "Force logout"}
          </Button>
        </div>

        {/* Reset password */}
        <div className="space-y-2">
          <Label htmlFor="password">Reset password</Label>
          <Input
            id="password"
            type="password"
            placeholder="New password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <Button
            variant="destructive"
            className="w-full"
            disabled={password.length < 8 || resetMut.isPending}
            onClick={() => setConfirmReset(true)}
          >
            <KeyRound className="size-4" /> {resetMut.isPending ? "Resetting…" : "Reset password"}
          </Button>
          <p className="text-xs text-muted-foreground">Rehashes the password and ends all of the user's sessions.</p>
        </div>
      </CardContent>

      <ConfirmModal
        open={confirmStatus}
        onClose={() => setConfirmStatus(false)}
        onConfirm={() => {
          setStatusMut.mutate(status, { onSettled: () => setConfirmStatus(false) });
        }}
        title={`Set status to "${status}"?`}
        description={
          status === "active"
            ? "The user will regain access."
            : "The user will be signed out immediately and lose access."
        }
        confirmLabel="Save"
        destructive={status !== "active"}
        loading={setStatusMut.isPending}
      />

      <ConfirmModal
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        onConfirm={() => {
          logoutMut.mutate(undefined, { onSettled: () => setConfirmLogout(false) });
        }}
        title="Force logout this user?"
        description="The user's refresh token will be invalidated — they'll need to log in again."
        confirmLabel="Force logout"
        destructive
        loading={logoutMut.isPending}
      />

      <ConfirmModal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          resetMut.mutate(password, {
            onSettled: () => {
              setConfirmReset(false);
              setPassword("");
            },
          });
        }}
        title="Reset this user's password?"
        description="A new password will be set and all of the user's sessions will end. Make sure you can share the new password with them securely."
        confirmLabel="Reset password"
        destructive
        loading={resetMut.isPending}
      />
    </Card>
  );
}

export default AdminUserDetailPage;