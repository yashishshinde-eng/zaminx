import { motion } from "framer-motion";
import { Users } from "lucide-react";
import type { DashboardSummary } from "@zaminex/shared";

/** At-a-glance team counts on the dashboard. Compact glass card with purple accent. */
export function TeamStatsCard({ team }: { team: DashboardSummary["team"] }) {
  const stats = [
    { label: "Direct Referrals", value: team.directCount, active: team.activeDirectCount },
    { label: "Total Team", value: team.teamCount, active: team.activeTeamCount },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card glass-card-hover relative flex h-full flex-col overflow-hidden"
    >
      <div className="flex items-center gap-3 p-5 pb-3">
        <div className="icon-box-purple">
          <Users className="size-4 text-gold" />
        </div>
        <h3 className="section-title">Team Stats</h3>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-5 pb-5">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[14px] border border-white/[0.06] bg-white/[0.02] p-3.5 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="metric-label">{s.label}</p>
                <p className="metric-value font-grotesk mt-0.5">{s.value}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-success" />
                <span className="text-xs font-medium text-muted-foreground">
                  <span className="font-semibold tabular-nums text-success">{s.active}</span> active
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}