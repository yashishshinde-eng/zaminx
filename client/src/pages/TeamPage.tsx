import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Users, ChevronRight, ChevronDown, Copy, UserCheck, Share2, Phone, UserPlus } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, DataTable, FilterBar, EmptyState, type Column } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { ReferralLinkCard } from "@/components/dashboard";
import { ActivateForMemberDialog } from "@/components/packages/ActivateForMemberDialog";
import { useAuth } from "@/context/AuthContext";
import { useReferralStats, useTeamReferrals, useTreeChildren } from "@/hooks/useReferrals";
import { useCountUp } from "@/hooks/useCountUp";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { formatDate, formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";
import type { ReferralMemberRow, ReferralMemberStatus } from "@zeminex/shared";

const STATUS_VARIANT: Record<ReferralMemberStatus, "success" | "warning" | "destructive"> = {
  active: "success",
  inactive: "warning",
  blocked: "destructive",
};

type TeamScope = "all" | "direct" | "level";
type StatusFilter = "all" | "active" | "inactive";

/** /app/team — referral link, team statistics, lazy referral tree, member list. */
export function TeamPage() {
  const { user } = useAuth();
  const stats = useReferralStats();

  // Team list state — two independent filter groups (scope + status), search, pagination.
  const [scope, setScope] = useState<TeamScope>("all");
  const [levelNum, setLevelNum] = useState<number | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  // "Activate a package for this member" dialog target (team-row action).
  const [activateTarget, setActivateTarget] = useState<{ id: string; name: string } | null>(null);
  const openActivateFor = useCallback((row: ReferralMemberRow) => {
    setActivateTarget({ id: row.id, name: row.name });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 whenever any filter changes.
  useEffect(() => setPage(1), [scope, levelNum, statusFilter]);

  // Deeper levels (L2+) present in the downline — options for the Level picker.
  const availableLevels = useMemo(
    () =>
      (stats.data?.byLevel ?? [])
        .map((l) => l.level)
        .filter((l) => l > 1)
        .sort((a, b) => a - b),
    [stats.data?.byLevel],
  );

  const teamParams = useMemo(
    () => ({
      level: scope === "direct" ? 1 : scope === "level" ? levelNum : undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      q: debouncedSearch || undefined,
      page,
      limit: 20,
    }),
    [scope, levelNum, statusFilter, debouncedSearch, page],
  );
  const team = useTeamReferrals(teamParams);

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
        key: "mobile",
        header: "Mobile",
        cell: (r) =>
          r.level === 1 ? (
            r.phone ? (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-xs">
                <Phone className="size-3 text-muted-foreground" />
                {r.phone}
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          ) : (
            <span className="text-muted-foreground/50" title="Mobile visible for direct referrals only">
              —
            </span>
          ),
      },
      {
        key: "level",
        header: "Level",
        align: "right",
        cell: (r) => <span className="tabular-nums text-muted-foreground">L{r.level}</span>,
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
      {
        key: "actions",
        header: "",
        align: "right",
        cell: (r) =>
          r.status === "inactive" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openActivateFor(r)}
            >
              <UserPlus className="size-3.5" /> Activate
            </Button>
          ) : (
            <span className="text-muted-foreground/40">—</span>
          ),
      },
    ],
    [openActivateFor],
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
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid gap-6 lg:grid-cols-2"
        >
          {referral && (
            <motion.div variants={staggerItem}>
              <ReferralLinkCard referral={referral} />
            </motion.div>
          )}
          <motion.div variants={staggerItem}>
            <StatsCard stats={stats.data} isLoading={stats.isLoading} />
          </motion.div>
        </motion.div>

        {/* Referral tree */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4 text-primary" /> Referral tree
              </CardTitle>
              <CardDescription>Expand a node to reveal its direct referrals.</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!stats.data?.link}
              onClick={() => {
                const link = stats.data?.link ?? "";
                if (navigator.share) {
                  navigator
                    .share({ title: "Join me on Zeminex Global", url: link })
                    .catch(() => undefined);
                } else {
                  navigator.clipboard.writeText(link).then(
                    () => toast.success("Referral link copied"),
                    () => toast.error("Couldn't copy"),
                  );
                }
              }}
            >
              <Share2 className="size-4" /> Share
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {stats.isLoading ? (
              <div className="h-24 animate-pulse rounded-md bg-muted/30" />
            ) : !stats.data || stats.data.directCount === 0 ? (
              <EmptyState
                icon={Users}
                title="No referrals yet"
                description="Share your referral link above to start building your team."
                action={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!stats.data?.link) return;
                      navigator.clipboard.writeText(stats.data.link).then(
                        () => toast.success("Referral link copied"),
                        () => toast.error("Couldn't copy"),
                      );
                    }}
                  >
                    <Copy className="size-4" /> Copy referral link
                  </Button>
                }
              />
            ) : (
              <TreeRoot rootName={user?.name ?? "You"} rootCode={stats.data.code} />
            )}
          </CardContent>
        </Card>

        {/* Team members table */}
        <section className="space-y-4">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search name or code…"
            filters={
              <div className="flex flex-wrap items-center gap-2">
                {/* Scope group — All / Direct / Level picker (combinable with status). */}
                <div className="flex items-center rounded-md border p-0.5">
                  <Button
                    type="button"
                    variant={scope === "all" ? "default" : "ghost"}
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => setScope("all")}
                  >
                    All
                  </Button>
                  <Button
                    type="button"
                    variant={scope === "direct" ? "default" : "ghost"}
                    size="sm"
                    className="h-8 px-3"
                    onClick={() => setScope("direct")}
                  >
                    Direct
                  </Button>
                  <DropdownMenu
                    align="end"
                    trigger={
                      <Button
                        type="button"
                        variant={scope === "level" ? "default" : "ghost"}
                        size="sm"
                        className="h-8 px-3"
                        disabled={availableLevels.length === 0}
                      >
                        {scope === "level" && levelNum ? `Level ${levelNum}` : "Level"}
                        <ChevronDown className="size-3.5 opacity-70" />
                      </Button>
                    }
                  >
                    {() => (
                      <>
                        <DropdownMenuLabel>Filter by level</DropdownMenuLabel>
                        {availableLevels.map((l) => (
                          <DropdownMenuItem
                            key={l}
                            onSelect={() => {
                              setLevelNum(l);
                              setScope("level");
                            }}
                          >
                            Level {l}
                            <span className="ml-auto text-xs text-muted-foreground">
                              {(stats.data?.byLevel ?? []).find((b) => b.level === l)?.count ?? 0}
                            </span>
                          </DropdownMenuItem>
                        ))}
                      </>
                    )}
                  </DropdownMenu>
                </div>

                {/* Status group — Active / Inactive (toggle off to clear → all statuses). */}
                <div className="flex items-center rounded-md border p-0.5">
                  {(["active", "inactive"] as const).map((s) => (
                    <Button
                      key={s}
                      type="button"
                      variant={statusFilter === s ? "default" : "ghost"}
                      size="sm"
                      className="h-8 px-3 capitalize"
                      onClick={() => setStatusFilter((prev) => (prev === s ? "all" : s))}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            }
          />
          <DataTable
            columns={columns}
            data={team.data?.items ?? []}
            rowKey={(r) => r.id}
            isLoading={team.isLoading}
            error={team.isError ? "We couldn't load your team members." : null}
            onRetry={() => team.refetch()}
            emptyTitle="No members match"
            emptyDescription="Try a different filter, or share your referral link to grow your team."
            page={team.data?.page ?? 1}
            pageCount={Math.max(1, team.data?.totalPages ?? 1)}
            onPageChange={setPage}
          />
        </section>
      </div>

      <ActivateForMemberDialog
        open={!!activateTarget}
        target={activateTarget ?? undefined}
        onClose={() => setActivateTarget(null)}
      />
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
          <span className="gradient-blue flex size-7 items-center justify-center rounded-md text-primary-foreground">
            <UserCheck className="size-4" />
          </span>
          Team statistics
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
          <div className="rounded-lg border border-border/60">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Level</span>
              <span className="text-right">Members</span>
              <span className="text-right">Active</span>
              <span className="text-right">Business</span>
            </div>
            {stats.byLevel.map((l) => (
              <div
                key={l.level}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 border-t border-border/40 px-3 py-2 text-sm"
              >
                <span className="font-medium">Level {l.level}</span>
                <span className="text-right tabular-nums text-muted-foreground">{l.count}</span>
                <span className="text-right tabular-nums text-success">{l.active}</span>
                <span className="text-right font-semibold tabular-nums">{formatCurrency(l.business)}</span>
              </div>
            ))}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 border-t border-border/60 bg-muted/30 px-3 py-2 text-sm">
              <span className="col-span-3 font-bold">Total team business</span>
              <span className="text-right font-bold tabular-nums">{formatCurrency(stats.teamBusiness)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  const animated = useCountUp(value, 600);
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tabular-nums">{Math.round(animated)}</p>
    </div>
  );
}

type ReferralStatsLite = {
  directCount: number;
  teamCount: number;
  activeDirectCount: number;
  activeTeamCount: number;
  code: string;
  byLevel: { level: number; count: number; active: number; business: number }[];
  teamBusiness: number;
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
        style={{ paddingLeft: `min(${depth * 1.5 + 0.5}rem, 40%)` }}
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
        <Badge variant="outline" className="shrink-0 font-mono text-xs">
          {node.referralCode}
        </Badge>
        {node.id !== "me" && (
          <Badge variant={STATUS_VARIANT[node.status]} className="shrink-0 capitalize">
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