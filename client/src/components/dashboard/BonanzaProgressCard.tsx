import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Gift, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCountUp } from "@/hooks/useCountUp";
import { useBonanzaOverview } from "@/hooks/useBonanzas";
import { formatCurrency } from "@/lib/utils";
import type { DashboardSummary } from "@zeminex/shared";

/**
 * Blueprint section 10 — Bonanza Progress. Shows the real total bonanza income
 * earned and links to the full Bonanza page. Premium glass card with gold accent.
 */
export function BonanzaProgressCard({ data }: { data: DashboardSummary }) {
  const { t } = useTranslation();
  const earned = useCountUp(data.income.bonanza, 1000);
  // "View offers" only makes sense when admins have published at least one
  // active offer — fetched from the cached bonanza overview (shared with the
  // Bonanza page). While loading or when none exist, the CTA is hidden.
  const overview = useBonanzaOverview();
  const hasOffers = !!overview.data?.offers && overview.data.offers.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card glass-card-hover relative flex h-full flex-col overflow-hidden"
    >
      {/* Gold gradient accent */}
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{
          background: "linear-gradient(90deg, hsl(var(--gold)), hsl(var(--gold-light)), hsl(var(--gold)))",
        }}
      />

      {/* Decorative gift icon */}
      <Gift className="pointer-events-none absolute bottom-3 right-3 size-16 text-white/[0.02]" />

      <div className="flex h-full flex-col p-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="icon-box-gold">
            <Gift className="size-5 text-gold" />
          </div>
          <div>
            <p className="section-title text-sm">{t("bonanzaProgress.title")}</p>
            <p className="text-[11px] text-muted-foreground">{t("bonanzaProgress.subtitle")}</p>
          </div>
        </div>

        {/* Total earned */}
        <div className="mt-4">
          <p className="metric-label">{t("bonanzaProgress.bonanzaEarned")}</p>
          <p className="metric-value font-grotesk mt-1 text-gradient-gold text-2xl">
            {formatCurrency(earned)}
          </p>
        </div>

        {/* CTA — only when at least one bonanza offer exists */}
        {hasOffers && (
          <div className="mt-auto pt-4">
            <Link
              to="/app/bonanzas"
              className="btn-secondary-premium inline-flex w-full items-center justify-center gap-2 rounded-[14px] px-4 py-2.5 text-sm font-semibold"
            >
              {t("bonanzaProgress.viewOffers")} <ArrowRight className="size-3.5" />
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  );
}