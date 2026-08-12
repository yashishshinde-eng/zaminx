import { useMemo, useState } from "react";
import { Send, Search, CheckCircle2, Clock, XCircle, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, DataTable, type Column } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminTickets, useAdminTicket, useAdminReplyTicket, useAdminTicketStatus } from "@/hooks/useAdminSupport";
import type { AdminTicketRow, TicketStatus, TicketCategory } from "@zeminex/shared";
import { formatDate, cn } from "@/lib/utils";

const STATUS_FILTERS: { value: "all" | TicketStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "answered", label: "Answered" },
  { value: "closed", label: "Closed" },
];

const STATUS_VARIANT: Record<TicketStatus, "warning" | "success" | "outline"> = {
  open: "warning",
  answered: "success",
  closed: "outline",
};

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  answered: "Answered",
  closed: "Closed",
};

const STATUS_ICON: Record<TicketStatus, typeof Clock> = {
  open: Clock,
  answered: CheckCircle2,
  closed: XCircle,
};

const CATEGORY_LABEL: Record<TicketCategory, string> = {
  account: "Account",
  payments: "Payments",
  withdrawals: "Withdrawals",
  package: "Package",
  technical: "Technical",
  other: "Other",
};

/** /app/admin/support — admin inbox of all support tickets. */
export function AdminSupportPage() {
  const [statusFilter, setStatusFilter] = useState<"all" | TicketStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | TicketCategory>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [replyText, setReplyText] = useState("");

  const params = useMemo(
    () => ({
      status: statusFilter === "all" ? undefined : statusFilter,
      category: categoryFilter === "all" ? undefined : categoryFilter,
      q: search.trim() || undefined,
      page,
      limit: 20,
    }),
    [statusFilter, categoryFilter, search, page],
  );

  const list = useAdminTickets(params);
  const detail = useAdminTicket(selectedId);
  const reply = useAdminReplyTicket();
  const status = useAdminTicketStatus();

  const selected = detail.data;

  const onReply = (e: React.FormEvent) => {
    e.preventDefault();
    const message = replyText.trim();
    if (!message || !selectedId) return;
    reply.mutate({ id: selectedId, message }, { onSuccess: () => setReplyText("") });
  };

  const onToggleStatus = () => {
    if (!selectedId || !selected) return;
    status.mutate({ id: selectedId, status: selected.status === "closed" ? "open" : "closed" });
  };

  const columns: Column<AdminTicketRow>[] = useMemo(
    () => [
      {
        key: "subject",
        header: "Subject",
        cell: (r) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{r.subject}</p>
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {r.replies[0]?.message ?? "—"}
            </p>
          </div>
        ),
      },
      {
        key: "user",
        header: "User",
        cell: (r) => (
          <div className="min-w-0">
            <p className="truncate text-sm">{r.user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{r.user.email}</p>
          </div>
        ),
      },
      {
        key: "category",
        header: "Category",
        cell: (r) => <Badge variant="outline">{CATEGORY_LABEL[r.category]}</Badge>,
      },
      {
        key: "status",
        header: "Status",
        cell: (r) => {
          const Icon = STATUS_ICON[r.status];
          return (
            <Badge variant={STATUS_VARIANT[r.status]}>
              <Icon className="mr-1 size-3" /> {STATUS_LABEL[r.status]}
            </Badge>
          );
        },
      },
      {
        key: "updated",
        header: "Last activity",
        cell: (r) => <span className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(r.updatedAt)}</span>,
      },
      {
        key: "action",
        header: "",
        align: "right",
        cell: (r) => (
          <Button type="button" variant="outline" size="sm" onClick={() => setSelectedId(r.id)}>
            Open
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <AppShell>
      <PageHeader
        title="Support Inbox"
        description="Respond to user issues and manage ticket status."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Admin", to: "/app/admin" }, { label: "Support" }]}
      />

      <div className="mt-6 space-y-4">
        {/* ── Filters ───────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.value}
              type="button"
              variant={statusFilter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setStatusFilter(f.value);
                setPage(1);
              }}
            >
              {f.label}
            </Button>
          ))}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value as "all" | TicketCategory);
              setPage(1);
            }}
            className="glass-input h-9 px-3 text-sm"
          >
            <option value="all">All categories</option>
            {(Object.keys(CATEGORY_LABEL) as TicketCategory[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
          <div className="relative ml-auto">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search subject…"
              className="glass-input h-9 w-full pl-8 pr-3 text-sm sm:w-56"
            />
          </div>
        </div>

        {/* ── Inbox table ───────────────────────────────────────── */}
        <DataTable
          columns={columns}
          data={list.data?.items ?? []}
          rowKey={(r) => r.id}
          isLoading={list.isLoading}
          error={list.isError ? "We couldn't load the support inbox." : null}
          onRetry={() => list.refetch()}
          emptyTitle="No tickets found"
          emptyDescription="Tickets raised by users will appear here."
          page={list.data?.page ?? 1}
          pageCount={Math.max(1, list.data?.totalPages ?? 1)}
          onPageChange={setPage}
        />
      </div>

      {/* ── Thread dialog ─────────────────────────────────────── */}
      <Dialog open={Boolean(selectedId)} onClose={() => setSelectedId(undefined)} className="max-w-2xl">
        {!selected ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <h2 className="truncate text-lg font-semibold">{selected.subject}</h2>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge variant="outline">{CATEGORY_LABEL[selected.category]}</Badge>
                  <Badge variant={STATUS_VARIANT[selected.status]}>{STATUS_LABEL[selected.status]}</Badge>
                  <span className="text-muted-foreground">
                    {selected.user.name} · {selected.user.email}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={status.isPending}
                onClick={onToggleStatus}
              >
                {selected.status === "closed" ? (
                  <>
                    <RotateCcw className="mr-1 size-3.5" /> Reopen
                  </>
                ) : (
                  <>
                    <XCircle className="mr-1 size-3.5" /> Close
                  </>
                )}
              </Button>
            </div>

            <div className="my-4 space-y-4 overflow-y-auto" style={{ maxHeight: "44vh" }}>
              {selected.replies.map((r) => {
                const mine = r.sender === "admin";
                return (
                  <div key={r.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[80%] space-y-1", mine && "text-right")}>
                      <p className="text-[11px] font-medium text-muted-foreground">
                        {mine ? "You" : selected.user.name} · {formatDate(r.createdAt)}
                      </p>
                      <div
                        className={cn(
                          "whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm",
                          mine
                            ? "gradient-blue text-primary-foreground rounded-br-sm"
                            : "bg-white/[0.04] text-foreground rounded-bl-sm border border-white/[0.06]",
                        )}
                      >
                        {r.message}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={onReply} className="flex items-end gap-2 border-t border-white/[0.06] pt-3">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Reply to user…"
                rows={2}
                className="glass-input min-h-[44px] flex-1 resize-none px-3 py-2 text-sm"
              />
              <Button type="submit" disabled={!replyText.trim() || reply.isPending}>
                <Send className="mr-1 size-4" /> Send
              </Button>
            </form>
          </>
        )}
      </Dialog>
    </AppShell>
  );
}