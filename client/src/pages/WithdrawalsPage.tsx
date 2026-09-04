import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDownToLine, AlertTriangle, Check, Clock, X, Info } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
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
import { sanitizePinEvent } from "@/lib/pin";

const MIN_WITHDRAWAL = 15;

const STATUS_FILTERS: { value: "all" | WithdrawalStatus; labelKey: string }[] = [
  { value: "all", labelKey: "common.all" },
  { value: "pending", labelKey: "withdrawals.statusPending" },
  { value: "under_review", labelKey: "withdrawals.statusUnderReview" },
  { value: "approved", labelKey: "withdrawals.statusApproved" },
  { value: "paid", labelKey: "withdrawals.statusPaid" },
  { value: "rejected", labelKey: "withdrawals.statusRejected" },
  { value: "cancelled", labelKey: "withdrawals.statusCancelled" },
];

const STATUS_VARIANT: Record<WithdrawalStatus, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
  pending: "warning",
  under_review: "secondary",
  approved: "default",
  paid: "success",
  rejected: "destructive",
  cancelled: "outline",
};

const STATUS_LABEL_KEY: Record<WithdrawalStatus, string> = {
  pending: "withdrawals.statusPending",
  under_review: "withdrawals.statusUnderReview",
  approved: "withdrawals.statusApproved",
  paid: "withdrawals.statusPaid",
  rejected: "withdrawals.statusRejected",
  cancelled: "withdrawals.statusCancelled",
};

/** Success-path stages, in order. Terminal off-path statuses (rejected/cancelled) are shown specially. */
const STAGES: WithdrawalStatus[] = ["pending", "under_review", "approved", "paid"];

/** /app/withdrawals — submit a withdrawal and track its history. */
export function WithdrawalsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const inactive = user?.status !== "active";
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
    setValue,
    formState: { errors },
  } = useForm<CreateWithdrawalBody>({
    resolver: zodResolver(createWithdrawalSchema.shape.body),
    defaultValues: { wallet: "bonus", transactionPassword: "" },
  });

  const onSubmit = (values: CreateWithdrawalBody) => {
    create.mutate(values, {
      onSuccess: () => reset({ wallet: values.wallet, transactionPassword: "" }),
    });
  };

  const columns: Column<WithdrawalRow>[] = useMemo(
    () => [
      {
        key: "wallet",
        header: t("withdrawals.columnWallet"),
        cell: (r) => <Badge variant="outline" className="capitalize">{r.wallet}</Badge>,
      },
      {
        key: "amount",
        header: t("withdrawals.columnAmount"),
        align: "right",
        cell: (r) => <span className="whitespace-nowrap font-semibold tabular-nums">{formatCurrency(r.amount)}</span>,
      },
      {
        key: "address",
        header: t("withdrawals.columnAddress"),
        cell: (r) => (
          <code className="block max-w-[160px] truncate font-mono text-xs text-muted-foreground" title={r.address}>
            {r.address}
          </code>
        ),
      },
      {
        key: "status",
        header: t("withdrawals.columnStatus"),
        cell: (r) => <Badge variant={STATUS_VARIANT[r.status]}>{t(STATUS_LABEL_KEY[r.status])}</Badge>,
      },
      {
        key: "remarks",
        header: t("withdrawals.columnRemarks"),
        cell: (r) => <span className="text-xs text-muted-foreground">{r.remarks ?? "—"}</span>,
      },
      {
        key: "date",
        header: t("withdrawals.columnDate"),
        cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(r.createdAt)}</span>,
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
              {t("withdrawals.cancel")}
            </Button>
          ) : null,
      },
    ],
    [cancel, t],
  );

  const available = wallet.data?.totalAvailable ?? 0;

  return (
    <AppShell>
      <PageHeader
        title={t("withdrawals.title")}
        description={t("withdrawals.description")}
        breadcrumbs={[{ label: t("common.home"), to: "/" }, { label: t("common.dashboard"), to: "/app" }, { label: t("withdrawals.title") }]}
      />

      <div className="mt-6 space-y-6">
        {/* Latest withdrawal status timeline */}
        {latest && <StatusTimeline withdrawal={latest} onCancel={() => cancel.mutate(latest.id)} canCancel={cancel.isPending} />}

        {/* Withdraw form */}
        <Card className="relative overflow-hidden">
          <div className="gradient-blue h-1 w-full" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowDownToLine className="size-4 text-primary" /> {t("withdrawals.newWithdrawal")}
            </CardTitle>
            <CardDescription>{t("withdrawals.newWithdrawalDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {!hasAddress && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                <div>
                  {t("withdrawals.addAddressWarning1")}{" "}
                  <a href="/app/settings" className="font-medium underline">{t("withdrawals.addAddressWarningSettings")}</a> {t("withdrawals.addAddressWarning2")}
                </div>
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-3" noValidate>
              <div className="space-y-2">
                <Label htmlFor="wallet">{t("withdrawals.fromWallet")}</Label>
                <select
                  id="wallet"
                  {...register("wallet")}
                  className="glass-input h-10 w-full px-3 text-sm"
                >
                  <option value="bonus">{t("wallet.bonus")}</option>
                  <option value="trading">{t("wallet.trading")}</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">{t("withdrawals.amountUsd")}</Label>
                <Input id="amount" type="number" step="0.01" min={MIN_WITHDRAWAL} {...register("amount", { valueAsNumber: true })} />
                {errors.amount ? (
                  <p className="text-sm text-destructive">{errors.amount.message}</p>
                ) : (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Info className="size-3" />
                    {t("withdrawals.minimumAvailable", { min: formatCurrency(MIN_WITHDRAWAL), available: formatCurrency(available) })}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="txPin">{t("withdrawals.transactionPin")}</Label>
                <Input
                  id="txPin"
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  pattern="\d*"
                  placeholder="••••"
                  autoComplete="off"
                  className="tracking-[0.5em]"
                  {...register("transactionPassword")}
                  onChange={(e) =>
                    setValue("transactionPassword", sanitizePinEvent(e), { shouldValidate: true })
                  }
                />
                {errors.transactionPassword && (
                  <p className="text-sm text-destructive">{errors.transactionPassword.message}</p>
                )}
              </div>
              <div className="sm:col-span-3 flex items-end">
                <Button type="submit" className="w-full sm:w-auto" disabled={create.isPending || !hasAddress || inactive}>
                  {create.isPending ? t("withdrawals.submitting") : t("withdrawals.submitWithdrawal")}
                </Button>
              </div>
              {inactive && (
                <p className="text-xs text-muted-foreground">
                  {t("withdrawals.activateHint")}
                </p>
              )}
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
                {t(f.labelKey)}
              </Button>
            ))}
          </div>

          <DataTable
            columns={columns}
            data={list.data?.items ?? []}
            rowKey={(r) => r.id}
            isLoading={list.isLoading}
            error={list.isError ? t("withdrawals.couldNotLoad") : null}
            onRetry={() => list.refetch()}
            emptyTitle={t("withdrawals.noWithdrawals")}
            emptyDescription={t("withdrawals.noWithdrawalsDesc")}
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
  const { t } = useTranslation();
  const terminal = withdrawal.status === "rejected" || withdrawal.status === "cancelled";
  const currentIndex = STAGES.indexOf(withdrawal.status);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="glass">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">{t("withdrawals.latestRequest", { amount: formatCurrency(withdrawal.amount) })}</CardTitle>
            <CardDescription>
              {t(STATUS_LABEL_KEY[withdrawal.status])} · {formatDate(withdrawal.createdAt)}
            </CardDescription>
          </div>
          {(withdrawal.status === "pending" || withdrawal.status === "under_review") && (
            <Button type="button" variant="outline" size="sm" disabled={canCancel} onClick={onCancel}>
              {t("withdrawals.cancelRequest")}
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
                <p className="font-medium">{t("withdrawals.requestWas", { status: t(STATUS_LABEL_KEY[withdrawal.status]).toLowerCase() })}</p>
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
                        {t(STATUS_LABEL_KEY[stage])}
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