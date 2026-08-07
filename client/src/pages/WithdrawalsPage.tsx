import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDownToLine, AlertTriangle, Check, Clock, X, Info } from "lucide-react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, DataTable, type Column } from "@/components/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWallet } from "@/hooks/useWallet";
import { useWithdrawals, useCreateWithdrawal, useCancelWithdrawal } from "@/hooks/useWithdrawals";
import { useAuth } from "@/context/AuthContext";
import { createWithdrawalSchema } from "@zeminex/shared";
import type { CreateWithdrawalBody, WithdrawalRow, WithdrawalStatus } from "@zeminex/shared";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

const MIN_WITHDRAWAL = 10;

const STATUS_FILTERS: { value: "all" | WithdrawalStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "under_review", label: "Under review" },
  { value: "approved", label: "Approved" },
  { value: "paid", label: "Paid" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_VARIANT: Record<WithdrawalStatus, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  pending: "warning",
  under_review: "secondary",
  approved: "default",
  paid: "success",
  rejected: "destructive",
  cancelled: "outline",
};

const STATUS_LABEL: Record<WithdrawalStatus, string> = {
  pending: "Pending",
  under_review: "Under review",
  approved: "Approved",
  paid: "Paid",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

/** Success-path stages, in order. Terminal off-path statuses (rejected/cancelled) are shown specially. */
const STAGES: WithdrawalStatus[] = ["pending", "under_review", "approved", "paid"];

/** /app/withdrawals — submit a withdrawal and track its history. */
export function WithdrawalsPage() {
  const { user } = useAuth();
  const wallet = useWallet();
  const [statusFilter, setStatusFilter] = useState<"all" | WithdrawalStatus>("all");
  const [page, setPage] = useState(1);

  const params = useMemo(
    () => ({ status: statusFilter === "all" ? undefined : statusFilter, page, limit: 20 }),
    [statusFilter, page],
  );
  const list = useWithdrawals(params);
  const create = useCreateWithdrawal();
  const cancel = useCancelWithdrawal();

  const hasAddress = Boolean(user?.walletAddresses?.usdtBep20);
  const latest = list.data?.items?.[0];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateWithdrawalBody>({
    resolver: zodResolver(createWithdrawalSchema.shape.body),
    defaultValues: { wallet: "main" },
  });

  const onSubmit = (values: CreateWithdrawalBody) => {
    create.mutate(values, { onSuccess: () => reset({ wallet: values.wallet }) });
  };

  const columns: Column<WithdrawalRow>[] = useMemo(
    () => [
      {
        key: "date",
        header: "Date",
        cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(r.createdAt)}</span>,
      },
      {
        key: "wallet",
        header: "Wallet",
        cell: (r) => <Badge variant="outline" className="capitalize">{r.wallet}</Badge>,
      },
      {
        key: "amount",
        header: "Amount",
        align: "right",
        cell: (r) => <span className="whitespace-nowrap font-semibold tabular-nums">{formatCurrency(r.amount)}</span>,
      },
      {
        key: "address",
        header: "Address",
        cell: (r) => (
          <code className="block max-w-[160px] truncate font-mono text-xs text-muted-foreground" title={r.address}>
            {r.address}
          </code>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (r) => <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>,
      },
      {
        key: "remarks",
        header: "Remarks",
        cell: (r) => <span className="text-xs text-muted-foreground">{r.remarks ?? "—"}</span>,
      },
      {
        key: "action",
        header: "",
        align: "right",
        cell: (r) =>
          r.status === "pending" || r.status === "under_review" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={cancel.isPending}
              onClick={() => cancel.mutate(r.id)}
            >
              Cancel
            </Button>
          ) : null,
      },
    ],
    [cancel],
  );

  const available = wallet.data?.totalAvailable ?? 0;

  return (
    <AppShell>
      <PageHeader
        title="Withdrawals"
        description="Withdraw USDT-BEP20. All requests are manually reviewed by admins."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Dashboard", to: "/app" }, { label: "Withdrawals" }]}
      />

      <div className="mt-6 space-y-6">
        {/* Latest withdrawal status timeline */}
        {latest && <StatusTimeline withdrawal={latest} onCancel={() => cancel.mutate(latest.id)} canCancel={cancel.isPending} />}

        {/* Withdraw form */}
        <Card className="relative overflow-hidden">
          <div className="gradient-blue h-1 w-full" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowDownToLine className="size-4 text-primary" /> New withdrawal
            </CardTitle>
            <CardDescription>Funds move to "on hold" until an admin approves and pays the request.</CardDescription>
          </CardHeader>
          <CardContent>
            {!hasAddress && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                <div>
                  Add a USDT-BEP20 withdrawal address in{" "}
                  <a href="/app/settings" className="font-medium underline">Settings</a> before withdrawing.
                </div>
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-3" noValidate>
              <div className="space-y-2">
                <Label htmlFor="wallet">From wallet</Label>
                <select
                  id="wallet"
                  {...register("wallet")}
                  className="glass-input h-10 w-full px-3 text-sm"
                >
                  <option value="main">Main</option>
                  <option value="bonus">Bonus</option>
                  <option value="trading">Trading</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (USD)</Label>
                <Input id="amount" type="number" step="0.01" min={MIN_WITHDRAWAL} {...register("amount", { valueAsNumber: true })} />
                {errors.amount ? (
                  <p className="text-sm text-destructive">{errors.amount.message}</p>
                ) : (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Info className="size-3" />
                    Minimum {formatCurrency(MIN_WITHDRAWAL)} · Available {formatCurrency(available)}
                  </p>
                )}
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full" disabled={create.isPending || !hasAddress}>
                  {create.isPending ? "Submitting…" : "Submit withdrawal"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* History */}
        <section className="space-y-4">
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
          </div>

          <DataTable
            columns={columns}
            data={list.data?.items ?? []}
            rowKey={(r) => r.id}
            isLoading={list.isLoading}
            error={list.isError ? "We couldn't load your withdrawals." : null}
            onRetry={() => list.refetch()}
            emptyTitle="No withdrawals yet"
            emptyDescription="Submit a withdrawal above — it will appear here while it's reviewed."
            page={list.data?.page ?? 1}
            pageCount={Math.max(1, list.data?.totalPages ?? 1)}
            onPageChange={setPage}
          />
        </section>
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Status timeline — horizontal stepper for the latest withdrawal     */
/* ------------------------------------------------------------------ */

function StatusTimeline({
  withdrawal,
  onCancel,
  canCancel,
}: {
  withdrawal: WithdrawalRow;
  onCancel: () => void;
  canCancel: boolean;
}) {
  const terminal = withdrawal.status === "rejected" || withdrawal.status === "cancelled";
  const currentIndex = STAGES.indexOf(withdrawal.status);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="glass">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Latest request — {formatCurrency(withdrawal.amount)}</CardTitle>
            <CardDescription>
              {STATUS_LABEL[withdrawal.status]} · {formatDate(withdrawal.createdAt)}
            </CardDescription>
          </div>
          {(withdrawal.status === "pending" || withdrawal.status === "under_review") && (
            <Button type="button" variant="outline" size="sm" disabled={canCancel} onClick={onCancel}>
              Cancel request
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {terminal ? (
            <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex size-9 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                <X className="size-5" />
              </div>
              <div>
                <p className="font-medium">This request was {STATUS_LABEL[withdrawal.status].toLowerCase()}</p>
                {withdrawal.remarks && <p className="text-sm text-muted-foreground">{withdrawal.remarks}</p>}
              </div>
            </div>
          ) : (
            <ol className="flex items-center">
              {STAGES.map((stage, i) => {
                const done = i < currentIndex;
                const active = i === currentIndex;
                return (
                  <li key={stage} className="flex flex-1 items-center last:flex-none">
                    <div className="flex flex-col items-center gap-1.5">
                      <span
                        className={cn(
                          "flex size-9 items-center justify-center rounded-full border-2 transition-colors",
                          done && "border-success bg-success text-success-foreground",
                          active && "gradient-blue border-transparent text-primary-foreground shadow-sm",
                          !done && !active && "border-border bg-card text-muted-foreground",
                        )}
                      >
                        {done ? <Check className="size-4" /> : active ? <Clock className="size-4" /> : i + 1}
                      </span>
                      <span
                        className={cn(
                          "text-[11px] font-medium capitalize",
                          (done || active) ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {STATUS_LABEL[stage]}
                      </span>
                    </div>
                    {i < STAGES.length - 1 && (
                      <div
                        className={cn(
                          "mx-1 h-0.5 flex-1 rounded-full transition-colors",
                          done ? "bg-success" : "bg-border",
                        )}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}