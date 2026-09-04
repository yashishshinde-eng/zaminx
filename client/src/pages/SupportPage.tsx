import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { LifeBuoy, Plus, Send, MessageSquare, CheckCircle2, Clock, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, EmptyState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useTickets, useTicket, useCreateTicket, useReplyTicket } from "@/hooks/useSupport";
import { createTicketSchema } from "@zeminex/shared";
import type { CreateTicketBody, TicketStatus, TicketCategory, TicketRow } from "@zeminex/shared";
import { formatDate, cn } from "@/lib/utils";

const STATUS_ICON: Record<TicketStatus, typeof Clock> = {
  open: Clock,
  answered: CheckCircle2,
  closed: XCircle,
};

const STATUS_VARIANT: Record<TicketStatus, "warning" | "success" | "outline"> = {
  open: "warning",
  answered: "success",
  closed: "outline",
};

/** Translated status/category label lookups — built from `t()` so callers just
 *  index by the enum value instead of re-deriving translation keys inline. */
function useTicketLabels() {
  const { t } = useTranslation();
  const statusLabel: Record<TicketStatus, string> = {
    open: t("support.statusOpen"),
    answered: t("support.statusAnswered"),
    closed: t("support.statusClosed"),
  };
  const categoryLabel: Record<TicketCategory, string> = {
    account: t("support.categoryAccount"),
    payments: t("support.categoryPayments"),
    withdrawals: t("support.categoryWithdrawals"),
    package: t("support.categoryPackage"),
    technical: t("support.categoryTechnical"),
    other: t("support.categoryOther"),
  };
  return { statusLabel, categoryLabel };
}

/** /app/support — raise an issue and follow the conversation with admins. */
export function SupportPage() {
  const { t } = useTranslation();
  const { statusLabel: STATUS_LABEL, categoryLabel: CATEGORY_LABEL } = useTicketLabels();

  const STATUS_FILTERS: { value: "all" | TicketStatus; label: string }[] = [
    { value: "all", label: t("common.all") },
    { value: "open", label: STATUS_LABEL.open },
    { value: "answered", label: STATUS_LABEL.answered },
    { value: "closed", label: STATUS_LABEL.closed },
  ];

  const [statusFilter, setStatusFilter] = useState<"all" | TicketStatus>("all");
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [createOpen, setCreateOpen] = useState(false);
  const [replyText, setReplyText] = useState("");

  const params = useMemo(
    () => ({ status: statusFilter === "all" ? undefined : statusFilter, page: 1, limit: 50 }),
    [statusFilter],
  );
  const list = useTickets(params);
  const detail = useTicket(selectedId);
  const create = useCreateTicket();
  const reply = useReplyTicket();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTicketBody>({
    resolver: zodResolver(createTicketSchema.shape.body),
    defaultValues: { category: "account", subject: "", message: "" },
  });

  const onCreate = (values: CreateTicketBody) => {
    create.mutate(values, {
      onSuccess: (row) => {
        reset({ category: "account", subject: "", message: "" });
        setCreateOpen(false);
        setSelectedId(row.id);
      },
    });
  };

  const onReply = (e: React.FormEvent) => {
    e.preventDefault();
    const message = replyText.trim();
    if (!message || !selectedId) return;
    reply.mutate(
      { id: selectedId, message },
      { onSuccess: () => setReplyText("") },
    );
  };

  const selected = detail.data;
  const isClosed = selected?.status === "closed";

  return (
    <AppShell>
      <PageHeader
        title={t("support.title")}
        description={t("support.description")}
        breadcrumbs={[{ label: t("common.home"), to: "/" }, { label: t("common.dashboard"), to: "/app" }, { label: t("support.title") }]}
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 size-4" /> {t("support.raiseIssue")}
          </Button>
        }
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        {/* ── Ticket list ─────────────────────────────────────────── */}
        <div className="space-y-3 lg:col-span-5">
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_FILTERS.map((f) => (
              <Button
                key={f.value}
                type="button"
                variant={statusFilter === f.value ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(f.value)}
              >
                {f.label}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            {list.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
            ) : list.data && list.data.items.length > 0 ? (
              list.data.items.map((t) => (
                <TicketListItem
                  key={t.id}
                  ticket={t}
                  active={t.id === selectedId}
                  onSelect={() => setSelectedId(t.id)}
                />
              ))
            ) : (
              <Card className="glass">
                <CardContent className="py-10">
                  <EmptyState
                    icon={LifeBuoy}
                    title={t("support.noTicketsTitle")}
                    description={t("support.noTicketsDesc")}
                    action={
                      <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
                        <Plus className="mr-1 size-4" /> {t("support.raiseIssue")}
                      </Button>
                    }
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* ── Conversation thread ─────────────────────────────────── */}
        <div className="lg:col-span-7">
          {!selected ? (
            <Card className="glass h-full">
              <CardContent className="flex h-full min-h-[320px] items-center justify-center py-10">
                <EmptyState
                  icon={MessageSquare}
                  title={t("support.selectTicketTitle")}
                  description={t("support.selectTicketDesc")}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="glass flex h-full flex-col">
              <CardHeader className="flex-row items-start justify-between space-y-0 border-b border-white/[0.06]">
                <div className="min-w-0 space-y-1">
                  <CardTitle className="truncate text-base">{selected.subject}</CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{CATEGORY_LABEL[selected.category]}</Badge>
                    <Badge variant={STATUS_VARIANT[selected.status]}>{STATUS_LABEL[selected.status]}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDate(selected.createdAt)}</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-4 overflow-y-auto py-4" style={{ maxHeight: "50vh" }}>
                {selected.replies.map((r) => {
                  const mine = r.sender === "user";
                  return (
                    <div key={r.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[80%] space-y-1", mine && "items-end text-right")}>
                        <p className="text-[11px] font-medium text-muted-foreground">
                          {mine ? t("support.you") : t("support.supportTeam")} · {formatDate(r.createdAt)}
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
              </CardContent>

              <div className="border-t border-white/[0.06] p-3">
                {isClosed ? (
                  <p className="py-2 text-center text-xs text-muted-foreground">
                    {t("support.ticketClosed")}
                  </p>
                ) : null}
                <form onSubmit={onReply} className="flex items-end gap-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={t("support.replyPlaceholder")}
                    rows={2}
                    className="glass-input min-h-[44px] flex-1 resize-none px-3 py-2 text-sm"
                  />
                  <Button type="submit" disabled={!replyText.trim() || reply.isPending}>
                    <Send className="mr-1 size-4" /> {t("support.send")}
                  </Button>
                </form>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ── Create ticket dialog ────────────────────────────────── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} className="max-w-lg">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <LifeBuoy className="size-5 text-primary" /> {t("support.dialogTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("support.dialogDesc")}
        </p>
        <form onSubmit={handleSubmit(onCreate)} className="mt-5 space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="category">{t("support.category")}</Label>
            <select id="category" {...register("category")} className="glass-input h-10 w-full px-3 text-sm">
              {(Object.keys(CATEGORY_LABEL) as TicketCategory[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">{t("support.subject")}</Label>
            <Input id="subject" placeholder={t("support.subjectPlaceholder")} {...register("subject")} />
            {errors.subject && <p className="text-sm text-destructive">{errors.subject.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">{t("support.message")}</Label>
            <textarea
              id="message"
              rows={5}
              placeholder={t("support.messagePlaceholder")}
              {...register("message")}
              className="glass-input w-full resize-none px-3 py-2 text-sm"
            />
            {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={create.isPending}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? t("support.submitting") : t("support.submitTicket")}
            </Button>
          </div>
        </form>
      </Dialog>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Ticket list item                                                   */
/* ------------------------------------------------------------------ */

function TicketListItem({
  ticket,
  active,
  onSelect,
}: {
  ticket: TicketRow;
  active: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  const { statusLabel: STATUS_LABEL, categoryLabel: CATEGORY_LABEL } = useTicketLabels();
  const Icon = STATUS_ICON[ticket.status];
  const lastReply = ticket.replies[ticket.replies.length - 1];
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      whileHover={{ y: -1 }}
      className={cn(
        "w-full rounded-xl border p-3 text-left transition-colors",
        active ? "border-blue/40 bg-blue/[0.08]" : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold">{ticket.subject}</p>
        <Badge variant={STATUS_VARIANT[ticket.status]}>
          <Icon className="mr-1 size-3" /> {STATUS_LABEL[ticket.status]}
        </Badge>
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="text-[10px]">
          {CATEGORY_LABEL[ticket.category]}
        </Badge>
        <span>·</span>
        <span>{t("support.messageCount", { count: ticket.replies.length })}</span>
      </div>
      {lastReply && (
        <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
          <span className="text-foreground/70">{lastReply.sender === "user" ? t("support.you") : t("support.supportTeam")}:</span>{" "}
          {lastReply.message}
        </p>
      )}
      <p className="mt-1.5 text-[11px] text-muted-foreground">{formatDate(ticket.updatedAt)}</p>
    </motion.button>
  );
}