import { useMemo, useState } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { PieChart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardSummary } from "@zaminex/shared";
import { themeColor } from "@/lib/chart";
import { formatCurrency, cn } from "@/lib/utils";

/** Donut chart of income split across the six streams, with an interactive legend. */
export function IncomeDistributionCard({ income }: { income: DashboardSummary["income"] }) {
  const allStreams = useMemo(
    () => [
      { label: "Trading", value: income.trading, color: "#10b981" },
      { label: "Direct", value: income.direct, color: "#0ea5e9" },
      { label: "Team", value: income.team, color: "#8b5cf6" },
      { label: "Community", value: income.community, color: "#f59e0b" },
      { label: "Rank", value: income.rankReward, color: "#f43f5e" },
      { label: "Bonanza", value: income.bonanza, color: "#d946ef" },
    ],
    [income.trading, income.direct, income.team, income.community, income.rankReward, income.bonanza],
  );
  const hasAnyData = allStreams.some((s) => s.value > 0);

  // Indices currently visible on the donut. Default: all.
  const [active, setActive] = useState<Set<number>>(() => new Set(allStreams.map((_, i) => i)));

  const visibleStreams = allStreams.filter((_, i) => active.has(i));

  const toggleLegend = (i: number) => {
    setActive((prev) => {
      // Solo→all: if only this slice is visible, re-enable everything.
      if (prev.size === 1 && prev.has(i)) {
        return new Set(allStreams.map((_, idx) => idx));
      }
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      // Never empty the chart — if everything was toggled off, show all.
      if (next.size === 0) return new Set(allStreams.map((_, idx) => idx));
      return next;
    });
  };

  const options: ApexOptions = useMemo(
    () => ({
      chart: { type: "donut", height: 240, background: "transparent", fontFamily: "inherit" },
      labels: visibleStreams.map((s) => s.label),
      colors: visibleStreams.map((s) => s.color),
      stroke: { width: 2, colors: [themeColor("card", "#ffffff")] },
      legend: { show: false },
      dataLabels: { enabled: false },
      tooltip: { y: { formatter: (v: number) => formatCurrency(v) } },
      responsive: [{ breakpoint: 640, options: { chart: { height: 200 } } }],
    }),
    [visibleStreams],
  );

  const total = allStreams.reduce((sum, s) => sum + s.value, 0);

  return (
    <Card className="flex flex-col">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <PieChart className="size-4 text-primary" /> Income distribution
        </CardTitle>
        <CardDescription>Share by income stream — tap a legend item to toggle</CardDescription>
      </CardHeader>
      <CardContent className="relative flex-1">
        {hasAnyData ? (
          <div className="flex flex-col items-center gap-4">
            <Chart options={options} series={visibleStreams.map((s) => s.value)} type="donut" height={240} />
            <ul className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3">
              {allStreams.map((s, i) => {
                const isVisible = active.has(i);
                const pct = total > 0 ? (s.value / total) * 100 : 0;
                return (
                  <li key={s.label}>
                    <button
                      type="button"
                      onClick={() => toggleLegend(i)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors",
                        isVisible ? "border-border hover:bg-accent/50" : "border-transparent opacity-40 hover:opacity-70",
                      )}
                      aria-pressed={isVisible}
                    >
                      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="min-w-0 flex-1 truncate font-medium">{s.label}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">{pct.toFixed(0)}%</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="flex h-[260px] flex-col items-center justify-center text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <PieChart className="size-6" />
            </div>
            <p className="mt-3 text-sm font-medium">No data yet</p>
            <p className="text-xs text-muted-foreground">Appears when your first earnings post.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}