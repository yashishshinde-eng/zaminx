import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRightLeft, Send, Wallet as WalletIcon, Check, X, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createP2PTransferSchema } from "@zeminex/shared";
import type { CreateP2PTransferBody, WalletType } from "@zeminex/shared";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, ErrorState, DataTable, type Column } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useP2PTransfers, useSendP2PTransfer } from "@/hooks/useP2P";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/context/AuthContext";
import { checkReferralCode } from "@/lib/referrals";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { sanitizePinEvent } from "@/lib/pin";

const WALLET_OPTIONS: { value: WalletType; labelKey: string }[] = [
  { value: "main", labelKey: "wallet.main" },
  { value: "bonus", labelKey: "wallet.bonus" },
  { value: "trading", labelKey: "wallet.trading" },
];

const STATUS_VARIANT: Record<string, "success" | "destructive"> = {
  completed: "success",
  failed: "destructive",
};

/** /app/p2p — P2P wallet-to-wallet transfers. */
const WALLET_FILTER_LABEL_KEY: Record<"all" | WalletType, string> = {
  all: "common.all",
  main: "wallet.main",
  bonus: "wallet.bonus",
  trading: "wallet.trading",
};

export function P2PPage() {
  const { t } = useTranslation();
  const [walletFilter, setWalletFilter] = useState<"all" | WalletType>("all");
  const [page, setPage] = useState(1);

  const params = useMemo(
    () => ({ wallet: walletFilter === "all" ? undefined : walletFilter, page, limit: 20 }),
    [walletFilter, page],
  );

  const transfers = useP2PTransfers(params);
  const transferColumns = useMemo(() => buildTransferColumns(t), [t]);

  return (
    <AppShell>
      <PageHeader
        title={t("p2p.title")}
        description={t("p2p.description")}
        breadcrumbs={[{ label: t("common.home"), to: "/" }, { label: t("common.dashboard"), to: "/app" }, { label: t("nav.p2p") }]}
      />

      <div className="mt-6 space-y-6">
        <TransferForm />

        {/* Transfer history */}
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-grotesk text-lg font-bold">{t("p2p.transferHistory")}</h2>
            <div className="flex rounded-[10px] border border-white/[0.08] bg-white/[0.02] p-0.5">
              {(["all", "main", "bonus", "trading"] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => { setWalletFilter(w); setPage(1); }}
                  className={cn(
                    "rounded-[8px] px-3 py-1.5 text-xs font-semibold transition-all duration-200",
                    walletFilter === w
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
                  )}
                >
                  {t(WALLET_FILTER_LABEL_KEY[w])}
                </button>
              ))}
            </div>
          </div>

          {transfers.isError ? (
            <ErrorState message={t("p2p.couldNotLoad")} onRetry={() => transfers.refetch()} />
          ) : (
            <TransferTable
              columns={transferColumns}
              data={transfers.data?.items ?? []}
              isLoading={transfers.isLoading}
              page={transfers.data?.page ?? 1}
              pageCount={transfers.data?.totalPages ?? 1}
              onPageChange={setPage}
            />
          )}
        </section>
      </div>
    </AppShell>
  );
}

/* ─── Transfer Form ────────────────────────────────────────────── */

function TransferForm() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const inactive = user?.status !== "active";
  const wallet = useWallet();
  const send = useSendP2PTransfer();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateP2PTransferBody>({
    resolver: zodResolver(createP2PTransferSchema.shape.body),
    defaultValues: { wallet: "main", transactionPassword: "" },
  });

  // Single source of truth for the selected wallet — RHF state, not a parallel
  // useState. The buttons call setValue so the submitted value always matches
  // the highlighted button (the previous manual register().onChange hack + a
  // controlled `value` on the hidden input could drift and submit the wrong wallet).
  const selectedWallet = watch("wallet") ?? "main";
  const amount = watch("amount");
  const watchedRecipientCode = watch("referralCode");
  const balances = wallet.data;
  const available = balances ? balances[selectedWallet].available : 0;
  const numericAmount = typeof amount === "number" && !Number.isNaN(amount) ? amount : 0;
  const insufficient = !!balances && numericAmount > 0 && numericAmount > available;

  // Live recipient-code verification — debounced, so the sender sees the
  // resolved recipient name (and a self-transfer warning) before submitting.
  const [recipientCheck, setRecipientCheck] = useState<{
    status: "idle" | "checking" | "valid" | "invalid" | "self";
    name?: string;
  }>({ status: "idle" });
  const reqIdRef = useRef(0);

  useEffect(() => {
    const code = (watchedRecipientCode ?? "").trim();
    const myCode = (user?.referralCode ?? "").trim();
    if (!code) {
      reqIdRef.current += 1;
      setRecipientCheck({ status: "idle" });
      return;
    }
    // Self-transfer guard short-circuits before any network call.
    if (myCode && code.toLowerCase() === myCode.toLowerCase()) {
      reqIdRef.current += 1;
      setRecipientCheck({ status: "self" });
      return;
    }
    const id = ++reqIdRef.current;
    setRecipientCheck({ status: "checking" });
    const t = setTimeout(async () => {
      try {
        const res = await checkReferralCode(code);
        if (id !== reqIdRef.current) return; // a newer keystroke superseded this
        setRecipientCheck({ status: res.valid ? "valid" : "invalid", name: res.name });
      } catch {
        if (id !== reqIdRef.current) return;
        // Network/429 — don't claim invalid; let the backend re-check on submit.
        setRecipientCheck({ status: "idle" });
      }
    }, 450);
    return () => clearTimeout(t);
  }, [watchedRecipientCode, user?.referralCode]);

  const onSubmit = (values: CreateP2PTransferBody) => {
    if (recipientCheck.status !== "valid") {
      toast.error(t("p2p.enterValidRecipient"));
      return;
    }
    if (numericAmount > available) {
      toast.error(t("p2p.insufficientBalanceToast", { available: formatCurrency(available), wallet: t(WALLET_OPTIONS.find((w) => w.value === selectedWallet)?.labelKey ?? "wallet.main") }));
      return;
    }
    send.mutate(values, {
      onSuccess: () => reset({ wallet: values.wallet, transactionPassword: "" }),
    });
  };

  return (
    <Card className="glass overflow-hidden">
      <CardHeader className="border-b border-white/[0.06] bg-gradient-to-r from-blue/5 via-transparent to-purple/5">
        <CardTitle className="flex items-center gap-2 font-grotesk text-base">
          <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-success/20 to-success/10">
            <Send className="size-3.5 text-success" />
          </div>
          {t("p2p.sendTransfer")}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Wallet selector — themed toggle group */}
          <div className="space-y-2">
            <Label>{t("p2p.fromWallet")}</Label>
            <div className="flex rounded-[10px] border border-white/[0.08] bg-white/[0.02] p-0.5">
              {WALLET_OPTIONS.map((w) => (
                <button
                  key={w.value}
                  type="button"
                  onClick={() => setValue("wallet", w.value, { shouldValidate: true })}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-[8px] px-3 py-2 text-sm font-semibold transition-all duration-200",
                    selectedWallet === w.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
                  )}
                >
                  <WalletIcon className="size-3.5" />
                  <span>{t(w.labelKey)}</span>
                  {balances && (
                    <span className={cn(
                      "text-[10px] font-medium tabular-nums",
                      selectedWallet === w.value ? "text-primary-foreground/70" : "text-muted-foreground/60",
                    )}>
                      {formatCurrency(balances[w.value].available)}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <input type="hidden" {...register("wallet")} />
            {errors.wallet && <p className="text-sm text-destructive">{errors.wallet.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">{t("p2p.amountUsd")}</Label>
              <Input id="amount" type="number" step="0.01" min="0.01" placeholder="0.00" {...register("amount", { valueAsNumber: true })} />
              {errors.amount ? (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              ) : insufficient ? (
                <p className="text-sm text-destructive">
                  {t("p2p.insufficientBalance", { available: formatCurrency(available), wallet: t(WALLET_OPTIONS.find((w) => w.value === selectedWallet)?.labelKey ?? "wallet.main") })}
                </p>
              ) : null}
            </div>

            {/* Recipient referral code */}
            <div className="space-y-2">
              <Label htmlFor="referralCode">{t("p2p.recipientCode")}</Label>
              <Input id="referralCode" placeholder="ZAMXXXXXXX" autoComplete="off" {...register("referralCode")} />
              {errors.referralCode ? (
                <p className="text-sm text-destructive">{errors.referralCode.message}</p>
              ) : recipientCheck.status === "valid" ? (
                <p className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-500">
                  <Check className="size-3.5" />
                  {t("p2p.sendingTo")} <span className="font-semibold">{recipientCheck.name}</span>
                </p>
              ) : recipientCheck.status === "self" ? (
                <p className="flex items-center gap-1.5 text-sm text-destructive">
                  <X className="size-3.5" />
                  {t("p2p.selfTransferError")}
                </p>
              ) : recipientCheck.status === "invalid" ? (
                <p className="flex items-center gap-1.5 text-sm text-destructive">
                  <X className="size-3.5" />
                  {t("p2p.noUserFound")}
                </p>
              ) : recipientCheck.status === "checking" ? (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  {t("p2p.verifying")}
                </p>
              ) : null}
            </div>
          </div>

          {/* Memo (optional) */}
          <div className="space-y-2">
            <Label htmlFor="memo">{t("p2p.memo")} <span className="text-muted-foreground">({t("p2p.optional")})</span></Label>
            <Input id="memo" placeholder="Payment for..." maxLength={200} {...register("memo")} />
            {errors.memo && <p className="text-sm text-destructive">{errors.memo.message}</p>}
          </div>

          {/* Transaction PIN */}
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

          <div className="flex flex-col items-start gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {t("p2p.yourReferralCode")} <span className="font-mono font-semibold text-foreground">{user?.referralCode}</span>
            </p>
            <Button
              type="submit"
              className="btn-premium"
              disabled={send.isPending || insufficient || inactive || recipientCheck.status !== "valid"}
            >
              {send.isPending ? t("p2p.sending") : <><ArrowRightLeft className="size-4" /> {t("p2p.sendTransfer")}</>}
            </Button>
          </div>
          {inactive && (
            <p className="text-xs text-muted-foreground">
              {t("p2p.activateHint")}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

/* ─── Transfer Table ───────────────────────────────────────────── */

interface TransferRow {
  id: string;
  fromUser: string;
  fromUserName: string;
  toUser: string;
  toUserName: string;
  wallet: string;
  amount: number;
  status: string;
  memo: string | null;
  createdAt: string;
}

function buildTransferColumns(t: (key: string) => string): Column<TransferRow>[] {
  return [
    {
      key: "detail",
      header: t("p2p.columnDetail"),
      cell: (r) => (
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{r.fromUserName}</span>
            <ArrowRightLeft className="size-3 text-muted-foreground" />
            <span className="font-medium">{r.toUserName}</span>
          </div>
          {r.memo && <p className="truncate text-xs text-muted-foreground">{r.memo}</p>}
        </div>
      ),
    },
    {
      key: "wallet",
      header: t("common.wallet"),
      cell: (r) => (
        <Badge variant="outline" className="capitalize">{r.wallet}</Badge>
      ),
    },
    {
      key: "amount",
      header: t("common.amount"),
      align: "right" as const,
      cell: (r) => (
        <span className={cn("whitespace-nowrap font-semibold tabular-nums", r.status === "completed" ? "text-success" : "text-destructive")}>
          {formatCurrency(r.amount)}
        </span>
      ),
    },
    {
      key: "status",
      header: t("common.status"),
      cell: (r) => (
        <Badge variant={STATUS_VARIANT[r.status] ?? "outline"} className="capitalize">
          {r.status}
        </Badge>
      ),
    },
    {
      key: "date",
      header: t("common.date"),
      cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(r.createdAt)}</span>,
    },
  ];
}

function TransferTable({
  columns,
  data,
  isLoading,
  page,
  pageCount,
  onPageChange,
}: {
  columns: Column<TransferRow>[];
  data: TransferRow[];
  isLoading: boolean;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <DataTable
      columns={columns}
      data={data}
      rowKey={(r) => r.id}
      isLoading={isLoading}
      emptyTitle={t("p2p.noTransfers")}
      emptyDescription={t("p2p.noTransfersDesc")}
      page={page}
      pageCount={pageCount}
      onPageChange={onPageChange}
    />
  );
}