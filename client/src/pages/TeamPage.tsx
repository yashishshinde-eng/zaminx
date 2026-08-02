import { useEffect, useMemo, useState } from "react";
import { Users, ChevronRight, ChevronDown, Copy, UserCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, DataTable, FilterBar, type Column } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReferralLinkCard } from "@/components/dashboard";
import { useAuth } from "@/context/AuthContext";
import { useReferralStats, useDirectReferrals, useTreeChildren } from "@/hooks/useReferrals";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";
import type { ReferralMemberRow, ReferralMemberStatus } from "@zaminex/shared";

const STATUS_FILTERS: { value: "all" | ReferralMemberStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "banned", label: "Banned" },
];

const STATUS_VARIANT: Record<ReferralMemberStatus, "success" | "warning" | "destructive"> = {
  active: "success",
  suspended: "warning",
  banned: "destructive",
};

/** /app/team — referral link, team statistics, lazy referral tree, direct list. */
export function TeamPage() {
  const { user } = useAuth();
  const stats = useReferralStats();

  // Direct-referrals list state (filter + search + pagination).
  const [statusFilter, setStatusFilter] = useState<"all" | ReferralMemberStatus>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => setPage(1), [statusFilter]);

  const directParams = useMemo(
    () => ({
      status: statusFilter === "all" ? undefined : statusFilter,
      q: debouncedSearch || undefined,
      page,
      limit: 20,
    }),
    [statusFilter, debouncedSearch, page],
  );
  const direct = useDirectReferrals(directParams);

  const columns: Column<ReferralMemberRow>[] = useMemo(
    () => [
      {
        key: "date",
        header: "Date",
        cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(r.joinedAt)}</span>,
      },
      {
        key: "member",
        header: "Member",
        cell: (r) => <span className="font-medium">{r.name}</span>,
      },
      {
        key: "code",
        header: "Code",
        cell: (r) => (
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(r.referralCode).then(
                () => toast.success("Code copied"),
                () => toast.error("Couldn't copy"),
              );
            }}
            className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 font-mono text-xs hover:bg-muted"
            title="Copy code"
          >
            {r.referralCode}
            <Copy className="size-3 text-muted-foreground" />
          </button>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (r) => <Badge variant={STATUS_VARIANT[r.status]} className="capitalize">{r.status}</Badge>,
      },
      {
        key: "direct",
        header: "Direct",
        align: "right",
        cell: (r) => <span className="tabular-nums text-muted-foreground">{r.directCount}</span>,
      },
    ],
    [],
  );

  const referral = stats.data ? { code: stats.data.code, link: stats.data.link } : undefined;

  return (
    <AppShell>
      <PageHeader
        title="Team"
        description="Your referral network — link, statistics, and the referral tree."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Dashboard", to: "/app" }, { label: "Team" }]}
      />

      <div className="mt-6 space-y-6">
        {/* Link + stats */}
        <div className="grid gap-6 lg:grid-cols-2">
          {referral && <ReferralLinkCard referral={referral} />}
          <StatsCard stats={stats.data} isLoading={stats.isLoading} />
        </div>

        {/* Referral tree */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4 text-primary" /> Referral tree
            </CardTitle>
            <CardDescription>Expand a node to reveal its direct referrals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {stats.isLoading ? (
              <div className="h-24 animate-pulse rounded-md bg-muted/30" />
            ) : !stats.data || stats.data.directCount === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm font-medium">No referrals yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Share your referral link above to start building your team.
                </p>
              </div>
            ) : (
              <TreeRoot rootName={user?.name ?? "You"} rootCode={stats.data.code} />
            )}
          </CardContent>
        </Card>

        {/* Direct referrals table */}
        <section className="space-y-4">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search name or code…"
            filters={
              <div className="flex rounded-md border p-0.5">
                {STATUS_FILTERS.map((f) => (
                  <Button
                    key={f.value}
                    type="button"
                    variant={statusFilter === f.value ? "default" : "ghost"}
                    size="sm"
                    className="h-8 px-3 capitalize"
                    onClick={() => setStatusFilter(f.value)}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            }
          />
          <DataTable
            columns={columns}
            data={direct.data?.items ?? []}
            rowKey={(r) => r.id}
            isLoading={direct.isLoading}
            error={direct.isError ? "We couldn't load your direct referrals." : null}
            onRetry={() => direct.refetch()}
            emptyTitle="No direct referrals"
            emptyDescription="Members you directly refer will appear here."
            page={direct.data?.page ?? 1}
            pageCount={Math.max(1, direct.data?.totalPages ?? 1)}
            onPageChange={setPage}
          />
        </section>
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Stats card                                                         */
/* ------------------------------------------------------------------ */

function StatsCard({ stats, isLoading }: { stats: ReferralStatsLite | undefined; isLoading: boolean }) {
  if (isLoading || !stats) {
    return <div className="h-32 animate-pulse rounded-lg bg-muted/30" />;
  }
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserCheck className="size-4 text-success" /> Team statistics
        </CardTitle>
        <CardDescription>Direct and all-level referral counts</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Direct" value={stats.directCount} />
          <Metric label="Total team" value={stats.teamCount} />
          <Metric label="Active direct" value={stats.activeDirectCount} />
          <Metric label="Active team" value={stats.activeTeamCount} />
        </div>
        {stats.byLevel.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground">By level</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {stats.byLevel.map((l) => (
                <Badge key={l.level} variant="outline" className="font-normal">
                  L{l.level}: <span className="ml-1 font-semibold tabular-nums">{l.count}</span>
                  <span className="ml-1 text-success">{l.active}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

type ReferralStatsLite = {
  directCount: number;
  teamCount: number;
  activeDirectCount: number;
  activeTeamCount: number;
  code: string;
  byLevel: { level: number; count: number; active: number }[];
};

/* ------------------------------------------------------------------ */
/*  Lazy referral tree                                                 */
/* ------------------------------------------------------------------ */

interface TreeNodeData {
  id: string; // "me" for the root, a real id for children
  name: string;
  referralCode: string;
  status: ReferralMemberStatus;
  directCount: number;
}

/** Root of the tree — the viewer. Loads its direct children on expand. */
function TreeRoot({ rootName, rootCode }: { rootName: string; rootCode: string }) {
  const root: TreeNodeData = {
    id: "me",
    name: rootName,
    referralCode: rootCode,
    status: "active",
    directCount: 0, // unknown for the root; chevron always shown
  };
  return (
    <div className="space-y-1">
      <TreeNode node={root} depth={0} />
    </div>
  );
}

/** A single expandable tree node. Lazily fetches children when first expanded. */
function TreeNode({ node, depth }: { node: TreeNodeData; depth: number }) {
  const [expanded, setExpanded] = useState(false);
  const children = useTreeChildren(expanded ? node.id : undefined, { page: 1, limit: 50 });

  const hasChildren = node.id === "me" || node.directCount > 0;

  return (
    <div>
      <div
        className="flex min-h-[44px] items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40"
        style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex size-6 shrink-0 items-center justify-center rounded hover:bg-muted"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
        ) : (
          <span className="size-6 shrink-0" />
        )}
        <span className="min-w-0 truncate font-medium">{node.name}</span>
        <Badge variant="outline" className="font-mono text-xs">
          {node.referralCode}
        </Badge>
        {node.id !== "me" && (
          <Badge variant={STATUS_VARIANT[node.status]} className="capitalize">
            {node.status}
          </Badge>
        )}
        {node.directCount > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            {node.directCount} direct
          </span>
        )}
      </div>

      {expanded && hasChildren && (
        <div className="space-y-1">
          {children.isLoading ? (
            <div className="ms-8 h-8 animate-pulse rounded bg-muted/30" />
          ) : children.isError ? (
            <p className="ms-8 py-2 text-xs text-destructive">Couldn't load this branch.</p>
          ) : (
            <>
              {(children.data?.items ?? []).map((child) => (
                <TreeNode
                  key={child.id}
                  node={{
                    id: child.id,
                    name: child.name,
                    referralCode: child.referralCode,
                    status: child.status,
                    directCount: child.directCount,
                  }}
                  depth={depth + 1}
                />
              ))}
              {(children.data?.total ?? 0) > (children.data?.items.length ?? 0) && (
                <p className="ms-8 py-1 text-xs text-muted-foreground">
                  +{(children.data?.total ?? 0) - (children.data?.items.length ?? 0)} more (load in the table below)
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default TeamPage;