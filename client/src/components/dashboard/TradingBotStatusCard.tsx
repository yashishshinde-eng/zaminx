import { motion } from "framer-motion";
import { Bot } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Sparkline } from "./Sparkline";
import { useCountUp } from "@/hooks/useCountUp";
import { formatCurrency } from "@/lib/utils";
import type { DashboardSummary } from "@zeminex/shared";

/**
 * Blueprint section 3 — Trading Bot Status. Honest, real-data card: the bot is
 * shown "Active" when the user holds an active package, else "Idle". The
 * headline figure is the real trading-income total and the sparkline is the
 * real 30-day income series. No fabricated yield percentages or bot telemetry.
 */
export function TradingBotStatusCard({ data }: { data: DashboardSummary }) {
  const { t } = useTranslation();
  const active = data.package.active;
  const trading = useCountUp(data.income.trading, 1000);
  const series = data.income.series.map((s) => s.value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card glass-card-hover relative flex h-full flex-col overflow-hidden"
      style={{
        boxShadow:
          "var(--shadow-card), inset 0 1px 0 0 rgba(255,255,255,0.06), 0 0 40px -12px hsl(var(--blue) / 0.06)",
      }}
    >
      <div className="flex flex-1 flex-col p-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="icon-box-blue">
              <Bot className="size-5 text-gold" />
            </div>
            <div>
              <p className="section-title text-sm">{t("botStatus.title")}</p>
              <p className="text-[11px] text-muted-foreground">{t("botStatus.subtitle")}</p>
            </div>
          </div>
          <StatusPill active={active} />
        </div>

        {/* Trade yield cashflows */}
        <div className="mt-5">
          <p className="metric-label">{t("wallet.typeTradingYield")}</p>
          <p className="metric-value font-grotesk mt-1 text-gradient-gold text-2xl">
            {formatCurrency(trading)}
          </p>
        </div>

        {/* Sparkline */}
        <div className="mt-auto pt-4">
          {series.length > 0 ? (
            <Sparkline data={series} height={44} />
          ) : (
            <p className="text-xs text-muted-foreground">
              {active ? t("botStatus.earningsWillAppear") : t("botStatus.activateToStart")}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
      }`}
    >
      <motion.span
        className="size-1.5 rounded-full bg-current"
        animate={active ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
        transition={active ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : undefined}
      />
      {active ? t("common.active") : t("botStatus.idle")}
    </span>
  );
}