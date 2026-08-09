import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Users, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { DashboardSummary } from "@zeminex/shared";

/**
 * At-a-glance team counts on the dashboard. The card stretches to the height
 * of the Recent Transactions panel beside it, so the content is distributed
 * (header → 2×2 stat grid → active-rate bar → "View team" footer) with the
 * footer pinned to the bottom — no dead blank space.
 */
export function TeamStatsCard({ team }: { team: DashboardSummary["team"] }) {
  const tiles = [
    { label: "Direct", value: team.directCount },
    { label: "Active Direct", value: team.activeDirectCount },
    { label: "Total Team", value: team.teamCount },
    { label: "Active Team", value: team.activeTeamCount },
  ];
  // Active-team rate drives the progress bar; guard against divide-by-zero.
  const activeRate = team.teamCount > 0 ? Math.min(100, Math.round((team.activeTeamCount / team.teamCount) * 100)) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card glass-card-hover relative flex flex-1 flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-5 pb-3">
        <div className="icon-box-purple">
          <Users className="size-4 text-gold" />
        </div>
        <h3 className="section-title">Team Stats</h3>
      </div>

      {/* 2×2 stat grid */}
      <div className="grid grid-cols-2 gap-3 px-5">
        {tiles.map((t, i) => (
          <motion.div
            key={t.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-3.5 backdrop-blur-xl"
          >
            <p className="metric-label">{t.label}</p>
            <p className="metric-value font-grotesk mt-0.5 tabular-nums">{t.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Active-rate progress — fills the middle, pushes the footer down */}
      <div className="mt-4 flex-1 px-5">
        <div className="flex items-center justify-between">
          <span className="metric-label">Active team rate</span>
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">{activeRate}%</span>
        </div>
        <Progress value={activeRate} glow className="mt-2" />
      </div>

      {/* Footer pinned to the bottom */}
      <Link
        to="/app/team"
        className="group m-5 mt-4 flex items-center justify-between rounded-[14px] border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-colors hover:bg-white/[0.05]"
      >
        <span className="text-sm font-semibold">View full team</span>
        <ArrowRight className="size-4 text-gold transition-transform group-hover:translate-x-0.5" />
      </Link>
    </motion.div>
  );
}