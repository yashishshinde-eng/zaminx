import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Wallet as WalletIcon, Coins, TrendingUp, PiggyBank } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, ErrorState, DataTable, FilterBar, type Column } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWallet, useWalletLedger } from "@/hooks/useWallet";
import { useCountUp } from "@/hooks/useCountUp";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { WalletBalances, WalletTxRow, WalletType } from "@zeminex/shared";

const WALLET_FILTERS: { value: "all" | WalletType; labelKey: string }[] = [
  { value: "all", labelKey: "common.all" },
  { value: "main", labelKey: "wallet.main" },
  { value: "bonus", labelKey: "wallet.bonus" },
  { value: "trading", labelKey: "wallet.trading" },
];

const TX_TYPES: { value: string; labelKey: string }[] = [
  { value: "", labelKey: "wallet.allTypes" },
  { value: "deposit", labelKey: "wallet.typeDeposit" },
  { value: "trading_yield", labelKey: "wallet.typeTradingYield" },
  { value: "direct_bonus", labelKey: "wallet.typeDirectBonus" },
  { value: "team_bonus", labelKey: "wallet.typeTeamBonus" },
  { value: "community_bonus", labelKey: "wallet.typeCommunityBonus" },
  { value: "rank_reward", labelKey: "wallet.typeRankReward" },
  { value: "bonanza", labelKey: "wallet.typeBonanza" },
  { value: "p2p_transfer_out", labelKey: "wallet.typeP2pOut" },
  { value: "p2p_transfer_in", labelKey: "wallet.typeP2pIn" },
  { value: "adjustment", labelKey: "wallet.typeAdjustment" },
];

function walletVariant(w: WalletType) {
  return w === "main" ? "default" : w === "bonus" ? "secondary" : "warning";
}

function typeLabel(t: (key: string) => string, type: string): string {
  const entry = TX_TYPES.find((x) => x.value === type);
  return entry ? t(entry.labelKey) : type;
}

/** /app/wallet — three wallet balances + immutable ledger history. */
export function WalletPage() {
  const { t } = useTranslation();
  const [walletFilter, setWalletFilter] = useState<"all" | WalletType>("all");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  // Debounce the memo search so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 when a filter changes.
  useEffect(() => {
    setPage(1);
  }, [walletFilter, typeFilter]);

  const wallet = useWallet();
  const ledgerParams = useMemo(
    () => ({
      wallet: walletFilter === "all" ? undefined : walletFilter,
      type: typeFilter || undefined,
      q: debouncedSearch || undefined,
      page,
      limit: 20,
    }),
    [walletFilter, typeFilter, debouncedSearch, page],
  );
  const ledger = useWalletLedger(ledgerParams);

  const columns: Column<WalletTxRow>[] = useMemo(
    () => [
      {
        key: "detail",
        header: t("wallet.columnDetail"),
        cell: (r) => (
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{typeLabel(t, r.type)}</span>
              <Badge variant={walletVariant(r.wallet)} className="capitalize">
                {r.wallet}
              </Badge>
            </div>
            {r.memo && <p className="truncate text-xs text-muted-foreground">{r.memo}</p>}
          </div>
        ),
      },
      {
        key: "amount",
        header: t("wallet.columnAmount"),
        align: "right",
        cell: (r) => (
          <span className={cn("whitespace-nowrap font-semibold tabular-nums", r.direction === "credit" ? "text-success" : "text-destructive")}>
            {r.direction === "credit" ? "+" : "−"}
            {formatCurrency(r.amount)}
          </span>
        ),
      },
      {
        key: "balance",
        header: t("wallet.columnBalance"),
        align: "right",
        cell: (r) => (
          <span className="whitespace-nowrap tabular-nums text-muted-foreground">{formatCurrency(r.availableAfter)}</span>
        ),
      },
      {
        key: "date",
        header: t("wallet.columnDate"),
        cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(r.createdAt)}</span>,
      },
    ],
    [t],
  );

  return (
    <AppShell>
      <PageHeader
        title={t("wallet.title")}
        description={t("wallet.description")}
        breadcrumbs={[{ label: t("common.home"), to: "/" }, { label: t("common.dashboard"), to: "/app" }, { label: t("wallet.title") }]}
      />

      <div className="mt-6 space-y-6">
        {/* Balance cards */}
        {wallet.isError ? (
          <ErrorState message={t("wallet.couldNotLoadBalances")} onRetry={() => wallet.refetch()} />
        ) : (
          <BalanceCards wallets={wallet.data} isLoading={wallet.isLoading} />
        )}

        {/* Ledger */}
        <section className="space-y-4">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t("wallet.searchMemo")}
            filters={
              <>
                <div className="flex rounded-md border p-0.5">
                  {WALLET_FILTERS.map((f) => (
                    <Button
                      key={f.value}
                      type="button"
                      variant={walletFilter === f.value ? "default" : "ghost"}
                      size="sm"
                      className="h-8 px-3"
                      onClick={() => setWalletFilter(f.value)}
                    >
                      {t(f.labelKey)}
                    </Button>
                  ))}
                </div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="glass-input h-9 px-3 text-sm"
                  aria-label={t("wallet.filterByType")}
                >
                  {TX_TYPES.map((tx) => (
                    <option key={tx.value} value={tx.value}>
                      {t(tx.labelKey)}
                    </option>
                  ))}
                </select>
              </>
            }
          />

          <DataTable
            columns={columns}
            data={ledger.data?.items ?? []}
            rowKey={(r) => r.id}
            isLoading={ledger.isLoading}
            error={ledger.isError ? t("wallet.couldNotLoadLedger") : null}
            onRetry={() => ledger.refetch()}
            emptyTitle={t("wallet.noTransactions")}
            emptyDescription={t("wallet.noTransactionsDesc")}
            emptyAction={
              <Button asChild size="sm">
                <Link to="/app/packages">{t("wallet.activatePackage")}</Link>
              </Button>
            }
            page={ledger.data?.page ?? 1}
            pageCount={Math.max(1, ledger.data?.totalPages ?? 1)}
            onPageChange={setPage}
          />
        </section>
      </div>
    </AppShell>
  );
}

interface WalletCardDef {
  label: string;
  icon: typeof WalletIcon;
  balance: WalletBalances["main"];
  /** Tailwind classes for the accent gradient strip. */
  strip: string;
}

/** Three wallet balance cards + totals, with animated count-ups and on-hold split bars. */
function BalanceCards({ wallets, isLoading }: { wallets: WalletBalances | undefined; isLoading: boolean }) {
  const { t } = useTranslation();
  if (isLoading || !wallets) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="h-28 animate-pulse bg-muted/30" />
          </Card>
        ))}
      </div>
    );
  }

  const cards: WalletCardDef[] = [
    { label: t("wallet.mainWallet"), icon: PiggyBank, balance: wallets.main, strip: "from-[#F6B400] to-[#0D6EFD]" },
    { label: t("wallet.bonusWallet"), icon: Coins, balance: wallets.bonus, strip: "from-emerald-500 to-teal-500" },
    { label: t("wallet.tradingWallet"), icon: TrendingUp, balance: wallets.trading, strip: "from-amber-500 to-orange-500" },
  ];

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <motion.div key={c.label} variants={staggerItem}>
            <WalletBalanceCard {...c} />
          </motion.div>
        ))}
      </div>

      {/* Totals strip */}
      <motion.div variants={staggerItem}>
        <Card className="glass overflow-hidden">
          <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
            <TotalStat label={t("wallet.totalAvailable")} value={wallets.totalAvailable} accent="text-foreground" />
            <TotalStat label={t("wallet.onHold")} value={wallets.totalOnHold} accent="text-warning" />
            <TotalStat label={t("wallet.grandTotal")} value={wallets.total} accent="text-gradient-gold" big />
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

function WalletBalanceCard({ label, icon: Icon, balance, strip }: WalletCardDef) {
  const { t } = useTranslation();
  const animated = useCountUp(balance.available, 700);
  const total = balance.available + balance.onHold;
  const availablePct = total > 0 ? Math.round((balance.available / total) * 100) : 100;

  return (
    <Card className="card-hover overflow-hidden border-0">
      {/* Accent gradient strip */}
      <div className={cn("h-1 w-full bg-gradient-to-r", strip)} />
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="size-4 text-primary" /> {label}
        </div>
        <p className="text-2xl font-bold tabular-nums">{formatCurrency(animated)}</p>
        {balance.onHold > 0 ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {t("wallet.onHold")} <span className="font-medium tabular-nums">{formatCurrency(balance.onHold)}</span>
              </span>
              <span className="tabular-nums text-muted-foreground">{availablePct}% {t("wallet.free")}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="gradient-blue h-full rounded-full transition-all" style={{ width: `${availablePct}%` }} />
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t("wallet.fullyAvailable")}</p>
        )}
      </CardContent>
    </Card>
  );
}

function TotalStat({ label, value, accent, big }: { label: string; value: number; accent: string; big?: boolean }) {
  const animated = useCountUp(value, 800);
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("font-bold tabular-nums", big ? "text-2xl" : "text-xl", accent)}>{formatCurrency(animated)}</p>
    </div>
  );
}