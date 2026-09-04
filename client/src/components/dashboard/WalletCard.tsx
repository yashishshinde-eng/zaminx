import { motion } from "framer-motion";
import { Wallet, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { DashboardSummary } from "@zeminex/shared";
import { formatCurrency } from "@/lib/utils";

/** Premium wallet overview — Main / Bonus / Trading available balances with glass tiles. */
export function WalletCard({ wallets }: { wallets: DashboardSummary["wallets"] }) {
  const { t } = useTranslation();
  const tiles = [
    { label: t("wallet.main"), balance: wallets.main },
    { label: t("wallet.bonus"), balance: wallets.bonus },
    { label: t("wallet.trading"), balance: wallets.trading },
  ];
  const anyOnHold = wallets.totalOnHold > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="neon-card neon-cyan relative overflow-hidden"
    >
      {/* Cyan top accent line (static, complements the traveling beam) */}
      <div
        className="absolute inset-x-0 top-0 h-[2px] z-10"
        style={{
          background: "linear-gradient(90deg, transparent, #00E5FF, #2979FF, #00E5FF, transparent)",
        }}
      />

      {/* Title row */}
      <div className="relative z-10 flex items-center justify-between p-5 pb-4">
        <div className="flex items-center gap-3">
          <div
            className="flex size-10 items-center justify-center rounded-[12px]"
            style={{
              background: "rgb(0 213 255 / 0.12)",
              boxShadow: "0 0 14px -3px rgb(0 213 255 / 0.4), inset 0 0 10px -4px rgb(0 213 255 / 0.3)",
              border: "1px solid rgb(0 213 255 / 0.22)",
            }}
          >
            <Wallet className="size-4" style={{ color: "#00E5FF", filter: "drop-shadow(0 0 4px rgb(0 213 255 / 0.5))" }} />
          </div>
          <h3 className="section-title">{t("common.wallet")}</h3>
        </div>
        <Link
          to="/app/wallet"
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-[#00E5FF]"
        >
          {t("walletCard.viewAll")} <ArrowRight className="size-3" />
        </Link>
      </div>

      {/* Wallet tiles */}
      <div className="relative z-10 px-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tiles.map((tile, i) => (
            <motion.div
              key={tile.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="relative overflow-hidden rounded-[16px] border border-white/[0.06] bg-white/[0.02] p-3.5 backdrop-blur-xl transition-all duration-300 hover:border-white/[0.1] hover:bg-white/[0.04]"
            >
              <p className="metric-label text-[10px]">{tile.label}</p>
              <p className="metric-value font-grotesk mt-1 text-base">{formatCurrency(tile.balance.available)}</p>
              {tile.balance.onHold > 0 && (
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {t("walletCard.onHoldAmount", { amount: formatCurrency(tile.balance.onHold) })}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Summary section */}
      <div className="relative z-10 mx-5 mt-4 space-y-1.5 border-t border-white/[0.06] pt-3 pb-5">
        <div className="flex items-center justify-between">
          <span className="metric-label">{t("walletCard.available")}</span>
          <span className="metric-value font-grotesk text-gradient-gold">{formatCurrency(wallets.totalAvailable)}</span>
        </div>
        {anyOnHold && (
          <div className="flex items-center justify-between">
            <span className="metric-label">{t("wallet.onHold")}</span>
            <span className="text-sm font-medium tabular-nums text-muted-foreground">
              {formatCurrency(wallets.totalOnHold)}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}