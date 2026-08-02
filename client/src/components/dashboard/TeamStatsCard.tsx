import { Users, UserCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DashboardSummary } from "@zaminex/shared";

interface Stat {
  label: string;
  value: number;
  active: number;
  icon: typeof Users;
  accent: string;
}

/** At-a-glance team counts on the dashboard. Phase 9. */
export function TeamStatsCard({ team }: { team: DashboardSummary["team"] }) {
  const stats: Stat[] = [
    { label: "Direct", value: team.directCount, active: team.activeDirectCount, icon: Users, accent: "text-primary" },
    { label: "Total team", value: team.teamCount, active: team.activeTeamCount, icon: UserCheck, accent: "text-success" },
  ];

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-4 text-primary" /> Team
        </CardTitle>
        <CardDescription>Your referrals at a glance</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 items-center gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex-1 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Icon className={cn("size-3.5", s.accent)} /> {s.label}
              </div>
              <p className="text-2xl font-bold tabular-nums">{s.value}</p>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium tabular-nums text-success">{s.active}</span> active
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}