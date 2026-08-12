import { motion } from "framer-motion";
import {
  BarChart3,
  UserPlus,
  Users,
  Globe,
  Award,
  Gift,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { DashboardSummary } from "@zeminex/shared";
import { formatCurrency } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { RankStars } from "./RankStars";

type IncomeStreamKey = "trading" | "direct" | "team" | "community" | "rankReward" | "bonanza";

const streams: { key: IncomeStreamKey; label: string; icon: LucideIcon; color: string; subtitle: string }[] = [
  { key: "trading", label: "Trading Income", icon: BarChart3, color: "#f6b400", subtitle: "1-2% daily arbitrage yield" },
  { key: "direct", label: "Direct Bonus", icon: UserPlus, color: "#0d6efd", subtitle: "10% on direct activations" },
  { key: "team", label: "Team Bonus", icon: Users, color: "#a855f7", subtitle: "Daily team energy" },
  { key: "community", label: "Community Bonus", icon: Globe, color: "#10b981", subtitle: "Monthly community bonus" },
  { key: "rankReward", label: "Rank Reward", icon: Award, color: "#f43f5e", subtitle: "Milestone rank payouts" },
  { key: "bonanza", label: "Bonanza Reward", icon: Gift, color: "#06b6d4", subtitle: "Time-limited offer rewards" },
];

/** Six income-stream tiles with colored accent borders and progress bars.
 *  Also surfaces the user's current rank (level + progress to next) at the top
 *  of the card, alongside the income breakdown. */
export function IncomeBreakdown({
  income,
  rank,
}: {
  income: DashboardSummary["income"];
  rank: DashboardSummary["account"]["rank"];
}) {
  const total = income.total;
  const pct = Math.round(Math.max(0, Math.min(1, rank.progress)) * 100);
  const isMaxRank = !rank.nextRank;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card glass-card-hover relative overflow-hidden"
    >
      {/* Title row */}
      <div className="flex items-center justify-between p-5 pb-4">
        <h3 className="section-title">Income Breakdown</h3>
        <span className="chip chip-gold">
          Total earned: <span className="font-bold tabular-nums">{formatCurrency(total)}</span>
        </span>
      </div>

      {/* Current rank strip — shows the user's achieved rank + progress to next */}
      <div className="mx-5 mb-4 flex items-center gap-3 rounded-[14px] border border-gold/15 bg-gold/[0.04] px-4 py-3">
        <div className="icon-box-gold shrink-0">
          <Award className="size-4 text-gold" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="metric-label">Current Rank</span>
            <span className="metric-value font-grotesk text-gradient-gold text-sm">{rank.name}</span>
          </div>
          <div className="mt-1.5">
            <RankStars name={rank.name} size={11} />
          </div>
          {isMaxRank ? (
            <div className="mt-1.5 flex items-center gap-1.5">
              <Sparkles className="size-3 text-gold" />
              <span className="text-[11px] font-medium text-gold">Max rank achieved</span>
            </div>
          ) : (
            <div className="mt-2">
              <Progress value={pct} glow className="h-1.5" />
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Progress to {rank.nextRank}</span>
                <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">{pct}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stream grid */}
      <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">
        {streams.map((s, i) => {
          const Icon = s.icon;
          const value = income[s.key];
          const pct = total > 0 ? (value / total) * 100 : 0;

          return (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="group relative overflow-hidden rounded-[16px] border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-white/[0.04]"
              style={{ borderLeftWidth: "4px", borderLeftColor: s.color }}
            >
              {/* Subtle glow on hover */}
              <div
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background: `radial-gradient(ellipse 80% 60% at 0% 0%, ${s.color}10, transparent 60%)`,
                }}
              />

              <div className="relative">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${s.color}15`, color: s.color }}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="metric-label truncate">{s.label}</p>
                  </div>
                </div>

                <p className="metric-value font-grotesk mt-2 text-lg">{formatCurrency(value)}</p>
                <p className="text-[11px] text-muted-foreground">{s.subtitle}</p>

                {/* Mini progress bar */}
                <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: s.color,
                      opacity: 0.75,
                    }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}