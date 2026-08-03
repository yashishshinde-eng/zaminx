import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ShieldCheck,
  MailCheck,
  LogOut,
  KeyRound,
  Wallet,
  Lock,
  Banknote,
  Phone,
  Calendar,
  Hash,
  Users,
  Package as PackageIcon,
  Activity as ActivityIcon,
  Bell,
  Gift,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, DataTable, type Column } from "@/components/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import { ConfirmModal } from "@/components/ui/dialog";
import { StatCard } from "@/components/dashboard";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import {
  useAdminUserDetail,
  useSetUserStatus,
  useVerifyUserEmail,
  useForceLogout,
  useAdminResetPassword,
  useAdjustUserWallet,
} from "@/hooks/useAdmin";
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

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Profile + wallets + package (spans 2) */}
        <div className="space-y-6 lg:col-span-2">
          <motion.div variants={staggerItem}>
            <ProfileCard user={user} />
          </motion.div>
          <motion.div variants={staggerItem}>
            <WalletsCard user={user} />
          </motion.div>
          <motion.div variants={staggerItem}>
            <WalletAdjustCard userId={user.id} />
          </motion.div>
          <motion.div variants={staggerItem}>
            <PackageCard user={user} />
          </motion.div>
          <motion.div variants={staggerItem}>
            <ActivityCard activity={user.recentActivity} onRetry={refetch} />
          </motion.div>
        </div>

        {/* Action panel */}
        <div className="space-y-6">
          <motion.div variants={staggerItem}>
            <ActionsPanel userId={user.id} currentStatus={user.status} isEmailVerified={user.isEmailVerified} />
          </motion.div>
        </div>
      </motion.div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Profile                                                              */
/* ------------------------------------------------------------------ */

function ProfileCard({ user }: { user: AdminUserDetail }) {
  return (
    <Card className="glass overflow-hidden">
      {/* Brand-gradient header strip with avatar + identity + status chips */}
      <div className="relative overflow-hidden">
        <div className="brand-gradient absolute inset-0 opacity-90" />
        <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar alt={user.name} fallback={user.name} size="lg" className="ring-2 ring-white/40" />
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-primary-foreground">{user.name}</h2>
              <p className="truncate font-mono text-xs text-primary-foreground/80">{user.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {userStatusBadge(user.status)}
            <Badge variant={user.isEmailVerified ? "success" : "secondary"} className="bg-white/20 text-primary-foreground">
              {user.isEmailVerified ? "Verified" : "Unverified"}
            </Badge>
            <Badge variant="secondary" className="bg-white/20 capitalize text-primary-foreground">
              {user.role}
            </Badge>
          </div>
        </div>
      </div>

      <CardContent className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
        <Field icon={Hash} label="User ID" value={<span className="font-mono text-xs">{user.id}</span>} />
        <Field icon={Gift} label="Referral code" value={<span className="font-mono text-xs">{user.referralCode}</span>} />
        <Field
          icon={Users}
          label="Referred by"
          value={user.referredBy ? <span className="font-mono text-xs">{user.referredBy}</span> : "—"}
        />
        <Field icon={Users} label="Direct referrals" value={String(user.directCount)} />
        <Field icon={Phone} label="Phone" value={user.phone ?? "—"} />
        <Field
          icon={Wallet}
          label="Wallet (USDT-BEP20)"
          value={user.walletAddresses.usdtBep20 ? <span className="font-mono text-xs">{user.walletAddresses.usdtBep20}</span> : "—"}
        />
        <Field icon={Calendar} label="Joined" value={formatDate(user.joinedAt)} />
        <Field icon={Calendar} label="Last login" value={formatDate(user.lastLoginAt)} />
        <Field
          icon={Bell}
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

function Field({ icon: Icon, label, value }: { icon: typeof Hash; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 space-y-0.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm">{value}</div>
      </div>
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
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="size-4 text-primary" /> Wallet balances
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard icon={Banknote} label="Total available" value={formatCurrency(w.totalAvailable)} gradient />
          <StatCard icon={Lock} label="Total on hold" value={formatCurrency(w.totalOnHold)} accent="bg-warning/15 text-warning" />
          <StatCard icon={Wallet} label="Total" value={formatCurrency(w.total)} accent="bg-primary/10 text-primary" />
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
                <tr key={r.name} className="border-b last:border-0 transition-colors hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">{r.name}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{formatCurrency(r.available)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">{formatCurrency(r.onHold)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Adjust wallet (Phase 14C)                                            */
/* ------------------------------------------------------------------ */

function WalletAdjustCard({ userId }: { userId: string }) {
  const [wallet, setWallet] = useState<"main" | "bonus" | "trading">("main");
  const [field, setField] = useState<"available" | "onHold">("available");
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [confirm, setConfirm] = useState(false);

  const adjustMut = useAdjustUserWallet(userId);
  const amt = Number(amount);
  const valid = Number.isFinite(amt) && amt > 0;
  const isDebit = direction === "debit";

  function submit() {
    if (!valid) return;
    adjustMut.mutate({ wallet, field, direction, amount: amt, memo: memo || undefined }, { onSettled: () => setConfirm(false) });
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <Banknote className="size-4 text-primary" /> Adjust wallet
        </CardTitle>
        <CardDescription>Credit or debit a wallet balance field. Each adjustment is recorded as an immutable ledger row and audited.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="adjWallet" className="text-xs text-muted-foreground">
              Wallet
            </Label>
            <select id="adjWallet" value={wallet} onChange={(e) => setWallet(e.target.value as "main" | "bonus" | "trading")} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="main">Main</option>
              <option value="trading">Trading</option>
              <option value="bonus">Bonus</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="adjField" className="text-xs text-muted-foreground">
              Field
            </Label>
            <select id="adjField" value={field} onChange={(e) => setField(e.target.value as "available" | "onHold")} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="available">Available</option>
              <option value="onHold">On hold</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="adjDirection" className="text-xs text-muted-foreground">
              Direction
            </Label>
            <select
              id="adjDirection"
              value={direction}
              onChange={(e) => setDirection(e.target.value as "credit" | "debit")}
              className={cn("h-9 w-full rounded-md border border-input bg-background px-3 text-sm", isDebit && "border-destructive/40")}
            >
              <option value="credit">Credit (+)</option>
              <option value="debit">Debit (−)</option>
            </select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="adjAmount" className="text-xs text-muted-foreground">
              Amount (USDT)
            </Label>
            <Input id="adjAmount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="adjMemo" className="text-xs text-muted-foreground">
              Memo (optional)
            </Label>
            <Input id="adjMemo" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Reason for adjustment" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button variant={isDebit ? "destructive" : "default"} disabled={!valid || adjustMut.isPending} onClick={() => setConfirm(true)}>
            {adjustMut.isPending ? "Applying…" : `${direction === "credit" ? "Credit" : "Debit"} ${amt || 0} USDT`}
          </Button>
        </div>
      </CardContent>

      <ConfirmModal
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={submit}
        title={`${direction === "credit" ? "Credit" : "Debit"} ${amt} USDT to ${wallet}/${field}?`}
        description={
          isDebit
            ? "A debit that would take the balance negative is rejected (no overdraft). This is recorded as an immutable ledger row."
            : "This credit is recorded as an immutable ledger row and audited to the activity log."
        }
        confirmLabel={isDebit ? "Debit" : "Credit"}
        destructive={isDebit}
        loading={adjustMut.isPending}
      />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Active package                                                       */
/* ------------------------------------------------------------------ */

function PackageCard({ user }: { user: AdminUserDetail }) {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <PackageIcon className="size-4 text-primary" /> Active package
        </CardTitle>
      </CardHeader>
      <CardContent>
        {user.activePackage ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field icon={PackageIcon} label="Package" value={user.activePackage.name} />
            <Field icon={Calendar} label="Activated" value={formatDate(user.activePackage.activatedAt)} />
            <Field icon={Calendar} label="Expires" value={formatDate(user.activePackage.expiresAt)} />
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
  { key: "resource", header: "Resource", cell: (r) => r.resource ?? "—" },
];

function ActivityCard({ activity, onRetry }: { activity: AdminUserActivityRow[]; onRetry: () => void }) {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <ActivityIcon className="size-4 text-primary" /> Recent activity
        </CardTitle>
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
    <Card className="glass">
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
          <Button className="w-full" disabled={!statusChanged || setStatusMut.isPending} onClick={() => setConfirmStatus(true)}>
            {setStatusMut.isPending ? "Saving…" : "Save status"}
          </Button>
        </div>

        {/* Verify email */}
        <div className="space-y-2">
          <Label>Email verification</Label>
          <Button variant="outline" className="w-full" disabled={isEmailVerified || verifyMut.isPending} onClick={() => verifyMut.mutate()}>
            <MailCheck className="size-4" /> {isEmailVerified ? "Already verified" : verifyMut.isPending ? "Verifying…" : "Mark email verified"}
          </Button>
        </div>

        {/* Force logout */}
        <div className="space-y-2">
          <Label>Session</Label>
          <Button variant="outline" className="w-full" disabled={logoutMut.isPending} onClick={() => setConfirmLogout(true)}>
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
          <Button variant="destructive" className="w-full" disabled={password.length < 8 || resetMut.isPending} onClick={() => setConfirmReset(true)}>
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
        description={status === "active" ? "The user will regain access." : "The user will be signed out immediately and lose access."}
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