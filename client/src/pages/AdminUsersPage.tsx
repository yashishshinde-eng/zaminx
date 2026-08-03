import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, X, Users, UserCheck, UserX, Ban } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, DataTable, type Column } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import { KpiCard } from "@/components/dashboard";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAdminUsers, useAdminDashboard } from "@/hooks/useAdmin";
import type { AdminUserReportRow, UserStatus } from "@zaminex/shared";

const STATUSES: ("all" | UserStatus)[] = ["all", "active", "suspended", "banned"];
const ROLES = ["all", "user", "admin"] as const;

const LIMIT = 20;

/** /app/admin/users — searchable, filterable admin user list. */
export function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | UserStatus>("all");
  const [role, setRole] = useState<(typeof ROLES)[number]>("all");
  const [page, setPage] = useState(1);

  // Applied filters drive the query; the form fields commit on Apply.
  const [applied, setApplied] = useState({
    q: "",
    status: "all" as "all" | UserStatus,
    role: "all" as string,
  });

  const params = {
    q: applied.q || undefined,
    status: applied.status === "all" ? undefined : applied.status,
    role: (applied.role === "all" ? undefined : applied.role) as "user" | "admin" | undefined,
    page,
    limit: LIMIT,
  };
  const { data, isLoading, isError, refetch } = useAdminUsers(params);
  const users = data?.items ?? [];
  const pagination = data && { page: data.page, totalPages: data.totalPages };

  // Platform-wide KPIs for the premium header strip (cached + shared with the
  // admin dashboard, so this adds no extra requests in the common case).
  const { data: dash, isLoading: dashLoading } = useAdminDashboard();
  const kpis = dash?.kpis;

  const activeFilters = applied.q !== "" || applied.status !== "all" || applied.role !== "all";

  function applyFilters() {
    setApplied({ q, status, role });
    setPage(1);
  }

  function clearFilters() {
    setQ("");
    setStatus("all");
    setRole("all");
    setApplied({ q: "", status: "all", role: "all" });
    setPage(1);
  }

  return (
    <AppShell>
      <PageHeader
        title="User Management"
        description="Search, filter, and inspect every platform user. Admins can suspend, ban, verify, force-logout, and reset passwords from each user's detail page."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Dashboard", to: "/app" }, { label: "Admin", to: "/app/admin" }, { label: "Users" }]}
      />

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="mt-6 space-y-6">
        {/* Premium KPI strip — animated count-up tiles fed by the admin dashboard summary. */}
        <motion.div variants={staggerItem} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {dashLoading || !kpis ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[112px] w-full rounded-lg" />)
          ) : (
            <>
              <KpiCard icon={Users} label="Total users" value={kpis.totalUsers} format="number" delay={0} />
              <KpiCard icon={UserCheck} label="Active" value={kpis.byStatus.active} format="number" delay={0.05} />
              <KpiCard icon={UserX} label="Suspended" value={kpis.byStatus.suspended} format="number" delay={0.1} />
              <KpiCard icon={Ban} label="Banned" value={kpis.byStatus.banned} format="number" delay={0.15} />
            </>
          )}
        </motion.div>

        {/* Filters — frosted-glass control bar */}
        <motion.div variants={staggerItem}>
          <Card className="glass overflow-hidden">
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                    placeholder="Name, email or referral code"
                    className="h-9 w-[220px] pl-8"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "all" | UserStatus)}
                  className="h-9 w-[150px] rounded-md border border-input bg-background px-3 text-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s === "all" ? "All statuses" : s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
                  className="h-9 w-[140px] rounded-md border border-input bg-background px-3 text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r === "all" ? "All roles" : r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={applyFilters}>
                  <SlidersHorizontal className="size-3.5" /> Apply
                </Button>
                <Button size="sm" variant="outline" onClick={clearFilters} disabled={!activeFilters}>
                  <X className="size-3.5" /> Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Table */}
        <motion.div variants={staggerItem}>
          <DataTable
            columns={columns}
            data={users}
            rowKey={(r) => r.id}
            isLoading={isLoading}
            error={isError ? "We couldn't load users. Please try again." : null}
            onRetry={() => refetch()}
            emptyTitle="No users match"
            emptyDescription="Try widening your search or clearing the filters."
            page={pagination?.page ?? 1}
            pageCount={pagination?.totalPages ?? 1}
            onPageChange={setPage}
          />
        </motion.div>
      </motion.div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Columns                                                             */
/* ------------------------------------------------------------------ */

const columns: Column<AdminUserReportRow>[] = [
  {
    key: "name",
    header: "User",
    cell: (r) => (
      <div className="flex items-center gap-3">
        <Avatar alt={r.name} fallback={r.name} size="sm" className="ring-1 ring-border/60" />
        <div className="min-w-0">
          <p className="truncate font-medium">{r.name}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">{r.email}</p>
        </div>
      </div>
    ),
  },
  { key: "role", header: "Role", cell: (r) => <span className="capitalize">{r.role}</span> },
  { key: "status", header: "Status", cell: (r) => userStatusBadge(r.status) },
  {
    key: "isEmailVerified",
    header: "Verified",
    cell: (r) => (r.isEmailVerified ? <Badge variant="success">Yes</Badge> : <Badge variant="secondary">No</Badge>),
  },
  { key: "referralCode", header: "Referral code", cell: (r) => <span className="font-mono text-xs">{r.referralCode}</span> },
  { key: "directs", header: "Directs", align: "right", cell: (r) => String(r.directCount) },
  { key: "walletAvailable", header: "Available", align: "right", cell: (r) => formatCurrency(r.walletAvailable) },
  { key: "joinedAt", header: "Joined", cell: (r) => formatDate(r.joinedAt) },
  { key: "lastLoginAt", header: "Last login", cell: (r) => formatDate(r.lastLoginAt) },
  {
    key: "view",
    header: "",
    align: "right",
    cell: (r) => (
      <Button asChild size="sm" variant="outline">
        <Link to={`/app/admin/users/${r.id}`}>View</Link>
      </Button>
    ),
  },
];

export function userStatusBadge(status: UserStatus) {
  const variant = status === "active" ? "success" : status === "suspended" ? "warning" : "destructive";
  return (
    <Badge variant={variant} className="capitalize">
      {status}
    </Badge>
  );
}

export default AdminUsersPage;