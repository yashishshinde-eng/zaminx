import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
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
import type { WalletBalances, WalletTxRow, WalletType } from "@zaminex/shared";

const WALLET_FILTERS: { value: "all" | WalletType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "main", label: "Main" },
  { value: "bonus", label: "Bonus" },
  { value: "trading", label: "Trading" },
];

const TX_TYPES: { value: string; label: string }[] = [
  { value: "", label: "All types" },
  { value: "deposit", label: "Deposit" },
  { value: "trading_yield", label: "Trading yield" },
  { value: "direct_bonus", label: "Direct bonus" },
  { value: "team_bonus", label: "Team bonus" },
  { value: "community_bonus", label: "Community bonus" },
  { value: "rank_reward", label: "Rank reward" },
  { value: "bonanza", label: "Bonanza" },
  { value: "adjustment", label: "Adjustment" },
];

function walletVariant(w: WalletType) {
  return w === "main" ? "default" : w === "bonus" ? "secondary" : "warning";
}

function typeLabel(t: string): string {
  return TX_TYPES.find((x) => x.value === t)?.label ?? t;
}

/** /app/wallet — three wallet balances + immutable ledger history. */
export function WalletPage() {
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
        key: "date",
        header: "Date",
        cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(r.createdAt)}</span>,
      },
      {
        key: "detail",
        header: "Detail",
        cell: (r) => (
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{typeLabel(r.type)}</span>
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
        header: "Amount",
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
        header: "Balance",
        align: "right",
        cell: (r) => (
          <span className="whitespace-nowrap tabular-nums text-muted-foreground">{formatCurrency(r.availableAfter)}</span>
        ),
      },
    ],
    [],
  );

  return (
    <AppShell>
      <PageHeader
        title="Wallet"
        description="Your balances and the immutable transaction ledger."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Dashboard", to: "/app" }, { label: "Wallet" }]}
      />

      <div className="mt-6 space-y-6">
        {/* Balance cards */}
        {wallet.isError ? (
          <ErrorState message="We couldn't load your wallet balances." onRetry={() => wallet.refetch()} />
        ) : (
          <BalanceCards wallets={wallet.data} isLoading={wallet.isLoading} />
        )}

        {/* Ledger */}
        <section className="space-y-4">
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search memo…"
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
                      {f.label}
                    </Button>
                  ))}
                </div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Filter by type"
                >
                  {TX_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
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
            error={ledger.isError ? "We couldn't load your ledger." : null}
            onRetry={() => ledger.refetch()}
            emptyTitle="No transactions yet"
            emptyDescription="Your deposits, trading yield, and bonuses will appear here."
            emptyAction={
              <Button asChild size="sm">
                <Link to="/app/packages">Activate a package</Link>
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
    { label: "Main Wallet", icon: PiggyBank, balance: wallets.main, strip: "from-violet-500 to-indigo-500" },
    { label: "Bonus Wallet", icon: Coins, balance: wallets.bonus, strip: "from-emerald-500 to-teal-500" },
    { label: "Trading Wallet", icon: TrendingUp, balance: wallets.trading, strip: "from-amber-500 to-orange-500" },
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
            <TotalStat label="Total available" value={wallets.totalAvailable} accent="text-foreground" />
            <TotalStat label="On hold" value={wallets.totalOnHold} accent="text-warning" />
            <TotalStat label="Grand total" value={wallets.total} accent="text-gradient" big />
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

function WalletBalanceCard({ label, icon: Icon, balance, strip }: WalletCardDef) {
  const animated = useCountUp(balance.available, 700);
  const total = balance.available + balance.onHold;
  const availablePct = total > 0 ? Math.round((balance.available / total) * 100) : 100;

  return (
    <Card className="card-hover relative overflow-hidden">
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
                On hold <span className="font-medium tabular-nums">{formatCurrency(balance.onHold)}</span>
              </span>
              <span className="tabular-nums text-muted-foreground">{availablePct}% free</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="brand-gradient h-full rounded-full transition-all" style={{ width: `${availablePct}%` }} />
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Fully available</p>
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