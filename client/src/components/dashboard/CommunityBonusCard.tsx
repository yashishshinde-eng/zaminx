import { motion } from "framer-motion";
import { Users, TrendingUp, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import type { CommunityBonusInfo } from "@zeminex/shared";

/**
 * Community Monthly Bonus — fixed-$ monthly payout card. Shows the user's
 * current star (recomputed server-side by the shared Star Qualification
 * Engine, never on the client), the star's fixed monthly amount, qualifying /
 * required members at the star's level, the next-star gap, the last
 * distribution and a link to the payout history. All data comes from the
 * dashboard summary's `communityBonus` slice — no qualification or payout
 * math lives in the client.
 */
export function CommunityBonusCard({ communityBonus }: { communityBonus: CommunityBonusInfo }) {
  const { t } = useTranslation();
  const { nextStar, lastDistribution } = communityBonus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card glass-card-hover relative overflow-hidden"
    >
      {/* Brand accent strip (#18F3CB) — distinct from Team Energy's gold */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-[#18F3CB]" />

      <div className="p-5">
        {/* Title */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="icon-box-gold"
              style={{ background: "rgba(24, 243, 203, 0.12)" }}
            >
              <Users className="size-4" style={{ color: "#18F3CB" }} />
            </div>
            <h3 className="section-title">{t("communityCard.title")}</h3>
          </div>
          <span className="metric-value font-grotesk text-lg tabular-nums" style={{ color: "#18F3CB" }}>
            {communityBonus.starLevel}★
          </span>
        </div>

        {/* Headline numbers */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <p className="metric-label">{t("communityCard.monthlyBonus")}</p>
            <p className="metric-value font-grotesk mt-1 text-base">{formatCurrency(communityBonus.monthlyBonus)}</p>
          </div>
          <div>
            <p className="metric-label">{t("communityCard.totalBonus")}</p>
            <p className="metric-value font-grotesk mt-1 text-base">{formatCurrency(communityBonus.totalBonus)}</p>
          </div>
          <div>
            <p className="metric-label">{t("communityCard.qualifyingMembers")}</p>
            <p className="metric-value font-grotesk mt-1 text-base tabular-nums">
              {communityBonus.qualifyingTeamMembers} / {communityBonus.requiredTeamMembers}
            </p>
          </div>
          <div>
            <p className="metric-label">{t("communityCard.lastDistribution")}</p>
            <p className="metric-value font-grotesk mt-1 flex items-center gap-1.5 text-base">
              <CalendarDays className="size-3.5 text-muted-foreground" />
              {lastDistribution ? (
                <>
                  {formatCurrency(lastDistribution.amount)}
                  <span className="text-xs text-muted-foreground">{lastDistribution.month}</span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">{t("communityCard.noDistributionYet")}</span>
              )}
            </p>
          </div>
        </div>

        {/* Next-star gap / max reached */}
        <div className="mt-4 flex items-center gap-2">
          {nextStar ? (
            <>
              <TrendingUp className="size-3.5" style={{ color: "#18F3CB" }} />
              <span className="text-xs font-medium" style={{ color: "#18F3CB" }}>
                {t("communityCard.nextStarGap", {
                  count: nextStar.gap,
                  level: nextStar.level,
                  star: nextStar.level,
                })}
              </span>
            </>
          ) : (
            <span className="text-xs font-medium" style={{ color: "#18F3CB" }}>
              {t("communityCard.maxStarAchieved")}
            </span>
          )}
        </div>

        {/* Per-level qualification rows (levels 1..3 compact view) */}
        <div className="mt-4 space-y-2.5">
          {communityBonus.perLevel.slice(0, 3).map((row) => {
            const pct = Math.min(100, Math.round((row.activeCount / row.required) * 100));
            return (
              <div key={row.level}>
                <div className="flex items-center justify-between text-xs">
                  <span className="metric-label">
                    {t("communityCard.levelRow", { level: row.level })}
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

        {/* Bonus history */}
        <Link
          to="/app/reports?kind=community"
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-[#18F3CB]"
        >
          {t("communityCard.viewHistory")}
        </Link>
      </div>
    </motion.div>
  );
}