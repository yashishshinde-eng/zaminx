import { motion } from "framer-motion";
import {
  Coins,
  HandCoins,
  Users,
  Globe,
  Award,
  Trophy,
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
  { key: "trading", label: "TRADE YIELD CASHFLOWS", icon: Coins, color: "#E8B923", subtitle: "1-2% daily arbitrage yield" },
  { key: "direct", label: "DIRECT CONNECT BONUS", icon: HandCoins, color: "#3B82F6", subtitle: "10% on direct activations" },
  { key: "team", label: "DAILY TEAM ENERGY BONUS", icon: Users, color: "#A855F7", subtitle: "Daily team energy" },
  { key: "community", label: "COMMUNITY MONTHLY BONUS", icon: Globe, color: "#22C55E", subtitle: "Monthly community bonus" },
  { key: "rankReward", label: "RANK AND REWARD BONUS", icon: Trophy, color: "#f43f5e", subtitle: "Milestone rank payouts" },
  { key: "bonanza", label: "Bonanza Reward", icon: Gift, color: "#06b6d4", subtitle: "Time-limited offer rewards" },
];

/* ── Color helpers for per-card accent glow + gradient bars ── */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Mix the accent toward white for the light end of the progress gradient. */
function lighten(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

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
              className="group relative overflow-hidden rounded-[18px] p-4 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:brightness-110"
              style={{
                backgroundColor: "#0d0f1a",
                border: `1.5px solid ${s.color}`,
                boxShadow: `0 0 16px ${hexToRgba(s.color, 0.35)}`,
              }}
            >
              {/* Icon badge — top-right, accent-bordered circular badge with glow */}
              <div
                className="absolute right-3 top-3 flex size-[60px] items-center justify-center rounded-full"
                style={{
                  border: `1.5px solid ${s.color}`,
                  backgroundColor: hexToRgba(s.color, 0.08),
                  color: s.color,
                  boxShadow: `0 0 14px ${hexToRgba(s.color, 0.4)}, inset 0 0 12px ${hexToRgba(s.color, 0.15)}`,
                }}
              >
                <Icon className="size-7" strokeWidth={1.8} />
              </div>

              <div className="relative pr-[70px]">
                <p
                  className="text-[11px] font-bold uppercase tracking-wider"
                  style={{ color: s.color }}
                >
                  {s.label}
                </p>

                <p className="mt-2 text-2xl font-bold tabular-nums text-white">
                  {formatCurrency(value)}
                </p>
                <p className="text-[11px] text-muted-foreground">{s.subtitle}</p>

                {/* Mini progress bar — accent light→solid gradient, rounded ends */}
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundImage: `linear-gradient(90deg, ${lighten(s.color, 0.45)}, ${s.color})`,
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