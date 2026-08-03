import { Award } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { DashboardSummary } from "@zaminex/shared";

/** Current rank + progress to the next rank. Placeholder until Phase 10. */
export function RankCard({ rank }: { rank: DashboardSummary["account"]["rank"] }) {
  const pct = Math.round(Math.max(0, Math.min(1, rank.progress)) * 100);
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <Award className="size-4 text-primary" /> Rank
        </CardTitle>
        <CardDescription>Ranks unlock rewards in the compensation plan</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Award className="size-6" />
          </div>
          <div>
            <p className="text-lg font-semibold">{rank.name}</p>
            <p className="text-xs text-muted-foreground">Current rank</p>
          </div>
        </div>
        {rank.nextRank && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progress to {rank.nextRank}</span>
              <span className="tabular-nums">{pct}%</span>
            </div>
            <Progress value={pct} className="mt-1.5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}