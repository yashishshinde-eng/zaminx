import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowRight,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  FlaskConical,
  Wallet as WalletIcon,
  CheckCircle2,
  Clock,
  TimerOff,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createDepositSchema } from "@zeminex/shared";
import type { CreateDepositBody, DepositRow } from "@zeminex/shared";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWallet } from "@/hooks/useWallet";
import { useCreateDeposit, useDepositStatus, useSimulatePayment } from "@/hooks/usePayments";
import { queryKeys } from "@/config";
import { formatCurrency, cn } from "@/lib/utils";

const QUICK_AMOUNTS = [50, 100, 250, 500];

/** Ticks every second so a countdown to `expiresMs` re-renders live. Returns
 *  the remaining milliseconds (clamped at 0) and an `expired` flag. Pass `null`
 *  for non-expiring deposits (no ticking). */
function useCountdown(expiresMs: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (expiresMs == null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiresMs]);
  if (expiresMs == null) return { remainingMs: null, expired: false };
  const remainingMs = Math.max(0, expiresMs - now);
  return { remainingMs, expired: remainingMs <= 0 };
}

/** Format milliseconds as MM:SS (e.g. 9:05, 0:42). */
function formatMSS(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * /app/deposit — wallet top-up page (decoupled from package activation).
 * Flow: enter amount → continue → NOWPayments QR/address → user deposits →
 * webhook verifies → Main wallet credited → user activates a package from
 * their balance on /app/packages.
 */
export function DepositPage() {
  const wallet = useWallet();
  const create = useCreateDeposit();
  const simulate = useSimulatePayment();
  const queryClient = useQueryClient();

  const [depositId, setDepositId] = useState<string | null>(null);
  const paidHandledRef = useRef(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateDepositBody>({
    resolver: zodResolver(createDepositSchema.shape.body),
    defaultValues: { amount: 50 },
  });
  const amountValue = watch("amount");

  // Poll the deposit while it is pending; auto-flips to the success state on
  // webhook (or sandbox simulate) confirmation.
  const status = useDepositStatus(depositId, !!depositId);

  // The created deposit holds the static payment instructions; the polled
  // status is the source of truth for the status transition.
  const createdDeposit = create.data ?? null;
  const liveStatus = status.data?.status;
  const isPaid = liveStatus === "paid" || createdDeposit?.status === "paid";

  // 10-minute countdown to the deposit's expiry. The server lazily flips a
  // pending deposit to `expired` on the next poll once `expiresAt` passes, but
  // we also expire locally so the UI transitions immediately at 0:00 without
  // waiting up to 3s for the next poll.
  const expiresMs = createdDeposit?.expiresAt ? Date.parse(createdDeposit.expiresAt) : null;
  const { remainingMs, expired: countdownExpired } = useCountdown(expiresMs);
  const isExpired =
    !isPaid &&
    (liveStatus === "expired" ||
      createdDeposit?.status === "expired" ||
      (countdownExpired && (liveStatus === "pending" || liveStatus === undefined)));

  // Fire the post-confirmation side effects once (v5 dropped useQuery onSuccess).
  useEffect(() => {
    if (status.data?.status === "paid" && !paidHandledRef.current) {
      paidHandledRef.current = true;
      toast.success(`Deposit confirmed — ${formatCurrency(status.data.amountUsd)} credited to your Main wallet.`);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.wallet.balance }),
        queryClient.invalidateQueries({ queryKey: queryKeys.payments.deposits }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
        queryClient.invalidateQueries({ queryKey: ["wallet", "ledger"] }),
      ]);
    }
  }, [status.data?.status, queryClient]);

  const onSubmit = (values: CreateDepositBody) => {
    paidHandledRef.current = false;
    create.mutate(values.amount, {
      onSuccess: (deposit) => setDepositId(deposit.id),
    });
  };

  const reset = () => {
    setDepositId(null);
    paidHandledRef.current = false;
    setValue("amount", 50);
  };

  return (
    <AppShell>
      <PageHeader
        title="Deposit"
        description="Top up your Main wallet with USDT-BEP20, then activate a package from your balance."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Dashboard", to: "/app" }, { label: "Deposit" }]}
      />

      <div className="mt-6 max-w-2xl space-y-4">
        {/* Main wallet balance */}
        <div className="glass-card flex items-center gap-3 p-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue/20 to-blue-dark/10">
            <WalletIcon className="size-4 text-blue-light" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Main wallet balance</p>
            <p className="font-grotesk text-lg font-bold tabular-nums">
              {wallet.isLoading ? "—" : formatCurrency(wallet.data?.main.available ?? 0)}
            </p>
          </div>
          {isPaid && (
            <Button asChild variant="outline" size="sm">
              <Link to="/app/packages">Activate a package <ArrowRight className="size-3.5" /></Link>
            </Button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {!depositId ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <Card className="glass">
                <CardHeader className="border-b border-white/[0.06]">
                  <CardTitle className="flex items-center gap-2 font-grotesk text-base">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue/20 to-blue-dark/10">
                      <ArrowDownToLine className="size-3.5 text-blue-light" />
                    </div>
                    Deposit funds
                  </CardTitle>
                  <CardDescription>Enter the amount you want to add to your wallet.</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (USD)</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="1"
                        placeholder="0.00"
                        {...register("amount", { valueAsNumber: true })}
                      />
                      {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {QUICK_AMOUNTS.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setValue("amount", q, { shouldValidate: true })}
                          className={cn(
                            "rounded-[10px] border px-3 py-1.5 text-sm font-semibold transition-all duration-200",
                            amountValue === q
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
                          )}
                        >
                          ${q}
                        </button>
                      ))}
                    </div>

                    <Button type="submit" className="btn-premium w-full h-11" disabled={create.isPending}>
                      {create.isPending ? "Starting…" : (<>Continue <ArrowRight className="size-4" /></>)}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">
                      You&apos;ll get a USDT-BEP20 address and QR code to send funds to.
                    </p>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          ) : isPaid ? (
            <motion.div
              key="paid"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <Card className="dash-panel border-success/40">
                <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
                  <div className="flex size-16 items-center justify-center rounded-full bg-success/10">
                    <CheckCircle2 className="size-8 text-success" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="font-grotesk text-xl font-bold tracking-tight">Deposit confirmed</h2>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(status.data?.amountUsd ?? createdDeposit?.amountUsd ?? 0)} has been credited to your Main wallet.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    <Button asChild className="btn-premium">
                      <Link to="/app/packages">Activate a package <ArrowRight className="size-4" /></Link>
                    </Button>
                    <Button type="button" variant="outline" onClick={reset}>Make another deposit</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : isExpired ? (
            <motion.div
              key="expired"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <Card className="glass border-destructive/40">
                <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
                  <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
                    <TimerOff className="size-8 text-destructive" />
                  </div>
                  <div className="space-y-1">
                    <h2 className="font-grotesk text-xl font-bold tracking-tight">Payment link expired</h2>
                    <p className="text-sm text-muted-foreground">
                      The 10-minute payment window for this deposit has closed. If you already sent funds, they will still be credited automatically once the network confirms. Start a new deposit to get a fresh address.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    <Button type="button" className="btn-premium" onClick={reset}>Start a new deposit</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="instructions"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {createdDeposit && (
                <DepositInstructions
                  deposit={createdDeposit}
                  remainingMs={remainingMs}
                  onReset={reset}
                  onRefresh={() => status.refetch()}
                  onSimulate={(id) => simulate.mutate(id, { onSuccess: () => status.refetch() })}
                  simulating={simulate.isPending}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}

/* ─── Payment instructions (QR + address + actions) ──────────────────── */

interface DepositInstructionsProps {
  deposit: DepositRow;
  /** Remaining ms until the 10-min window closes (null = non-expiring). */
  remainingMs: number | null;
  onReset: () => void;
  onRefresh: () => void;
  onSimulate: (id: string) => void;
  simulating: boolean;
}

function DepositInstructions({ deposit, remainingMs, onReset, onRefresh, onSimulate, simulating }: DepositInstructionsProps) {
  const [copied, setCopied] = useState(false);
  const copyAddress = async () => {
    if (!deposit.payAddress) return;
    try {
      await navigator.clipboard.writeText(deposit.payAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  // The countdown is live in the parent; here we just render it. The parent
  // swaps this whole card out for the expired card once it hits 0:00.
  const low = remainingMs != null && remainingMs <= 60_000;

  return (
    <Card className="glass border-warning/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="size-4 text-warning" /> Send your payment
          {remainingMs != null && (
            <span
              className={cn(
                "ml-auto inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-sm font-semibold tabular-nums",
                low ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning",
              )}
              title="This payment link expires after 10 minutes"
            >
              <Clock className="size-3.5" />
              {formatMSS(remainingMs)}
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Scan the QR or copy the address below and send USDT-BEP20. Your wallet is credited automatically once the payment is confirmed. This link expires in 10 minutes.
          {deposit.sandbox && " (Sandbox mode — use the simulate button to test.)"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-6">
          {/* QR code — encodes the pay-to address */}
          {deposit.payAddress && (
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-2xl bg-white p-3 shadow-lg">
                <QRCodeSVG value={deposit.payAddress} size={168} level="M" />
              </div>
              <p className="text-xs text-muted-foreground">Scan to get the address</p>
            </div>
          )}

          <div className="flex-1 space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Amount due</p>
              <p className="font-grotesk text-2xl font-bold tabular-nums">
                {deposit.payAmount != null ? formatCurrency(deposit.payAmount) : formatCurrency(deposit.amountUsd)}{" "}
                <span className="text-sm font-normal text-muted-foreground">USDT-BEP20</span>
              </p>
            </div>

            {deposit.payAddress && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pay-to address</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded-md border border-white/[0.08] bg-muted px-3 py-2 font-mono text-xs">
                    {deposit.payAddress}
                  </code>
                  <Button type="button" variant="outline" size="icon" onClick={copyAddress} aria-label="Copy address">
                    {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {deposit.hostedUrl && (
            <Button asChild size="sm">
              <a href={deposit.hostedUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" /> Pay with NOWPayments
              </a>
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="size-4" /> I&apos;ve paid — refresh
          </Button>
          {deposit.sandbox && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={simulating}
              onClick={() => onSimulate(deposit.id)}
            >
              {simulating ? <><FlaskConical className="size-4" /> Simulating…</> : <><FlaskConical className="size-4" /> Simulate payment (dev)</>}
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={onReset}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default DepositPage;