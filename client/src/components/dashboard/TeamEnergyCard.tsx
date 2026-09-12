import { motion } from "framer-motion";
import { Flame, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import type { TeamEnergyInfo } from "@zeminex/shared";

/**
 * Daily Team Energy — star-qualified bonus card. Shows the user's current
 * energy star (recomputed server-side, never on the client), the bonus rate it
 * earns, today's + total payouts, per-level active/required progress toward
 * the next star, and a link to the bonus history in /reports/team. All data
 * comes from the dashboard summary's `teamEnergy` slice — no qualification or
 * payout math lives in the client.
 */
export function TeamEnergyCard({ teamEnergy }: { teamEnergy: TeamEnergyInfo }) {
  const { t } = useTranslation();
  const { nextStar } = teamEnergy;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card glass-card-hover relative overflow-hidden"
    >
      {/* Gold gradient accent */}
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{
          background: "linear-gradient(90deg, hsl(var(--gold)), hsl(var(--gold-light)), hsl(var(--gold)))",
        }}
      />

      <div className="p-5">
        {/* Title */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="icon-box-gold">
              <Flame className="size-4 text-gold" />
            </div>
            <h3 className="section-title">{t("teamEnergyCard.title")}</h3>
          </div>
          <span className="metric-value font-grotesk text-gradient-gold text-lg tabular-nums">
            {teamEnergy.starLevel}★
          </span>
        </div>

        {/* Headline numbers */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <p className="metric-label">{t("teamEnergyCard.todayBonus")}</p>
            <p className="metric-value font-grotesk mt-1 text-base">{formatCurrency(teamEnergy.todayBonus)}</p>
          </div>
          <div>
            <p className="metric-label">{t("teamEnergyCard.totalBonus")}</p>
            <p className="metric-value font-grotesk mt-1 text-base">{formatCurrency(teamEnergy.totalBonus)}</p>
          </div>
          <div>
            <p className="metric-label">{t("teamEnergyCard.bonusRate")}</p>
            <p className="metric-value font-grotesk mt-1 text-base">{teamEnergy.bonusPercentage}%</p>
          </div>
          <div>
            <p className="metric-label">{t("teamEnergyCard.teamMembers")}</p>
            <p className="metric-value font-grotesk mt-1 text-base tabular-nums">{teamEnergy.teamMemberCount}</p>
          </div>
        </div>

        {/* Per-level qualification rows */}
        <div className="mt-4 space-y-2.5">
          {teamEnergy.perLevel.map((row) => {
            const pct = Math.min(100, Math.round((row.activeCount / row.required) * 100));
            return (
              <div key={row.level}>
                <div className="flex items-center justify-between text-xs">
                  <span className="metric-label">
                    {t("teamEnergyCard.levelRow", { level: row.level })}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {row.activeCount} / {row.required}
                  </span>
                </div>
                <Progress value={pct} glow={!row.qualified && pct > 0} className="mt-1.5" />
              </div>
            );
          })}
        </div>

        {/* Next-star gap / max reached */}
        <div className="mt-4 flex items-center gap-2">
          {nextStar ? (
            <>
              <TrendingUp className="size-3.5 text-gold" />
              <span className="text-xs font-medium text-gold">
                {t("teamEnergyCard.nextStarGap", {
                  count: nextStar.gap,
                  level: nextStar.level,
                  star: nextStar.level,
                })}
              </span>
            </>
          ) : (
            <span className="text-xs font-medium text-gold">{t("teamEnergyCard.maxStarAchieved")}</span>
          )}
        </div>

        {/* Bonus history */}
        <Link
          to="/reports/team"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-gold"
        >
          {t("teamEnergyCard.viewHistory")}
        </Link>
      </div>
    </motion.div>
  );
}