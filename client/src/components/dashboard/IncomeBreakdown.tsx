import {
  TrendingUp,
  Users,
  Zap,
  Globe,
  Award,
  Gift,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardSummary } from "@zaminex/shared";
import { formatCurrency } from "@/lib/utils";
import { StatCard } from "./StatCard";

type IncomeStreamKey = "trading" | "direct" | "team" | "community" | "rankReward" | "bonanza";

const STREAMS: { key: IncomeStreamKey; label: string; desc: string; icon: LucideIcon; accent: string }[] = [
  { key: "trading", label: "Trading Income", desc: "1–2% daily arbitrage yield", icon: TrendingUp, accent: "bg-emerald-500/10 text-emerald-600" },
  { key: "direct", label: "Direct Bonus", desc: "10% on direct activations", icon: Users, accent: "bg-sky-500/10 text-sky-600" },
  { key: "team", label: "Team Bonus", desc: "Daily team energy bonus", icon: Zap, accent: "bg-violet-500/10 text-violet-600" },
  { key: "community", label: "Community Bonus", desc: "Monthly community bonus", icon: Globe, accent: "bg-amber-500/10 text-amber-600" },
  { key: "rankReward", label: "Rank Reward", desc: "Milestone rank payouts", icon: Award, accent: "bg-rose-500/10 text-rose-600" },
  { key: "bonanza", label: "Bonanza Reward", desc: "Time-limited offer rewards", icon: Gift, accent: "bg-fuchsia-500/10 text-fuchsia-600" },
];

/** Six income-stream tiles. All zero until Phase 10. */
export function IncomeBreakdown({ income }: { income: DashboardSummary["income"] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-baseline justify-between space-y-0">
        <CardTitle className="text-base">Income breakdown</CardTitle>
        <p className="text-sm text-muted-foreground">
          Total earned <span className="font-semibold text-foreground tabular-nums">{formatCurrency(income.total)}</span>
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STREAMS.map((s) => (
            <StatCard
              key={s.key}
              icon={s.icon}
              label={s.label}
              value={formatCurrency(income[s.key])}
              subtitle={s.desc}
              accent={s.accent}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}