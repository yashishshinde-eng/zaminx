import { motion } from "framer-motion";
import { Award, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { RankStars } from "./RankStars";
import type { DashboardSummary } from "@zeminex/shared";

/** Current rank + progress to the next rank. Glass card with gold accent. */
export function RankCard({ rank }: { rank: DashboardSummary["account"]["rank"] }) {
  const pct = Math.round(Math.max(0, Math.min(1, rank.progress)) * 100);
  const isMaxRank = !rank.nextRank;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
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
        <div className="flex items-center gap-3">
          <div className="icon-box-gold">
            <Award className="size-4 text-gold" />
          </div>
          <h3 className="section-title">Current Rank</h3>
        </div>

        {/* Rank name */}
        <div className="mt-4 flex items-center gap-3">
          {isMaxRank && <Sparkles className="size-5 text-gold" />}
          <p className="metric-value font-grotesk text-gradient-gold text-xl">
            {rank.name}
          </p>
        </div>

        {/* Star-wise level — filled gold stars out of 10 */}
        <div className="mt-2">
          <RankStars name={rank.name} size={14} />
        </div>

        {isMaxRank ? (
          <div className="mt-3 flex items-center gap-2">
            <Sparkles className="size-3.5 text-gold" />
            <span className="text-xs font-medium text-gold">Max rank achieved</span>
          </div>
        ) : (
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <span className="metric-label">Progress to {rank.nextRank}</span>
              <span className="text-xs font-semibold tabular-nums text-muted-foreground">{pct}%</span>
            </div>
            <Progress value={pct} glow className="mt-2" />
          </div>
        )}
      </div>
    </motion.div>
  );
}