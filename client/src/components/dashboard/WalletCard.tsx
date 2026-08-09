import { motion } from "framer-motion";
import { Wallet, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { DashboardSummary } from "@zeminex/shared";
import { formatCurrency } from "@/lib/utils";

/** Premium wallet overview — Main / Bonus / Trading available balances with glass tiles. */
export function WalletCard({ wallets }: { wallets: DashboardSummary["wallets"] }) {
  const tiles = [
    { label: "Main", balance: wallets.main },
    { label: "Bonus", balance: wallets.bonus },
    { label: "Trading", balance: wallets.trading },
  ];
  const anyOnHold = wallets.totalOnHold > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card glass-card-hover relative overflow-hidden"
    >
      {/* Gradient top border accent */}
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{
          background: "linear-gradient(90deg, hsl(var(--blue)), hsl(var(--gold)), hsl(var(--blue)))",
        }}
      />

      {/* Title row */}
      <div className="flex items-center justify-between p-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="icon-box-blue">
            <Wallet className="size-4 text-gold" />
          </div>
          <h3 className="section-title">Wallet</h3>
        </div>
        <Link
          to="/app/wallet"
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-gold"
        >
          View all <ArrowRight className="size-3" />
        </Link>
      </div>

      {/* Wallet tiles */}
      <div className="px-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tiles.map((t, i) => (
            <motion.div
              key={t.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="relative overflow-hidden rounded-[16px] border border-white/[0.06] bg-white/[0.02] p-3.5 backdrop-blur-xl transition-all duration-300 hover:border-white/[0.1] hover:bg-white/[0.04]"
            >
              <p className="metric-label text-[10px]">{t.label}</p>
              <p className="metric-value font-grotesk mt-1 text-base">{formatCurrency(t.balance.available)}</p>
              {t.balance.onHold > 0 && (
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  +{formatCurrency(t.balance.onHold)} on hold
                </p>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Summary section */}
      <div className="mx-5 mt-4 space-y-1.5 border-t border-white/[0.06] pt-3 pb-5">
        <div className="flex items-center justify-between">
          <span className="metric-label">Available</span>
          <span className="metric-value font-grotesk text-gradient-gold">{formatCurrency(wallets.totalAvailable)}</span>
        </div>
        {anyOnHold && (
          <div className="flex items-center justify-between">
            <span className="metric-label">On hold</span>
            <span className="text-sm font-medium tabular-nums text-muted-foreground">
              {formatCurrency(wallets.totalOnHold)}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}