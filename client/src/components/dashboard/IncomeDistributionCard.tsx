import { useMemo } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { PieChart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardSummary } from "@zaminex/shared";
import { themeColor } from "@/lib/chart";
import { formatCurrency } from "@/lib/utils";

/** Donut chart of income split across the six streams. Empty-state until Phase 10. */
export function IncomeDistributionCard({ income }: { income: DashboardSummary["income"] }) {
  const streams = [
    { label: "Trading", value: income.trading, color: "#10b981" },
    { label: "Direct", value: income.direct, color: "#0ea5e9" },
    { label: "Team", value: income.team, color: "#8b5cf6" },
    { label: "Community", value: income.community, color: "#f59e0b" },
    { label: "Rank", value: income.rankReward, color: "#f43f5e" },
    { label: "Bonanza", value: income.bonanza, color: "#d946ef" },
  ];
  const hasData = streams.some((s) => s.value > 0);

  const options: ApexOptions = useMemo(
    () => ({
      chart: { type: "donut", height: 260, background: "transparent", fontFamily: "inherit" },
      labels: streams.map((s) => s.label),
      colors: streams.map((s) => s.color),
      stroke: { width: 2, colors: [themeColor("card", "#ffffff")] },
      legend: { position: "bottom", labels: { colors: themeColor("muted-foreground", "#64748b") } },
      dataLabels: { enabled: false },
      tooltip: { y: { formatter: (v: number) => formatCurrency(v) } },
      responsive: [{ breakpoint: 640, options: { chart: { height: 220 } } }],
    }),
    // streams values are stable per render; recompute only when income totals change
    [income.trading, income.direct, income.team, income.community, income.rankReward, income.bonanza],
  );

  return (
    <Card className="flex flex-col">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <PieChart className="size-4 text-primary" /> Income distribution
        </CardTitle>
        <CardDescription>Share by income stream</CardDescription>
      </CardHeader>
      <CardContent className="relative flex-1">
        {hasData ? (
          <Chart options={options} series={streams.map((s) => s.value)} type="donut" height={260} />
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