import { useMemo } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardSummary } from "@zaminex/shared";
import { themeColor } from "@/lib/chart";
import { formatCurrency } from "@/lib/utils";

/** Area chart of total income over time. Empty-state overlay until Phase 10. */
export function IncomeChartCard({ income }: { income: DashboardSummary["income"] }) {
  const hasData = income.series.length > 0;

  const options: ApexOptions = useMemo(
    () => ({
      chart: {
        type: "area",
        height: 260,
        toolbar: { show: false },
        background: "transparent",
        fontFamily: "inherit",
      },
      colors: [themeColor("primary", "hsl(222 47% 45%)")],
      stroke: { curve: "smooth", width: 2 },
      dataLabels: { enabled: false },
      grid: { borderColor: themeColor("border", "hsl(214 32% 91%)"), strokeDashArray: 4 },
      xaxis: {
        categories: income.series.map((s) => s.date),
        labels: { style: { colors: themeColor("muted-foreground", "#64748b") } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { colors: themeColor("muted-foreground", "#64748b") },
          formatter: (v: number) => formatCurrency(v),
        },
      },
      fill: {
        type: "gradient",
        gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 100] },
      },
      tooltip: {
        theme: "light",
        y: { formatter: (v: number) => formatCurrency(v) },
      },
      responsive: [{ breakpoint: 640, options: { chart: { height: 220 } } }],
    }),
    [income.series],
  );

  const series = [{ name: "Total income", data: income.series.map((s) => s.value) }];

  return (
    <Card className="flex flex-col">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="size-4 text-primary" /> Income over time
        </CardTitle>
        <CardDescription>Daily total earnings</CardDescription>
      </CardHeader>
      <CardContent className="relative flex-1">
        {hasData ? (
          <Chart options={options} series={series} type="area" height={260} />
        ) : (
          <div className="flex h-[260px] flex-col items-center justify-center text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <TrendingUp className="size-6" />
            </div>
            <p className="mt-3 text-sm font-medium">No data yet</p>
            <p className="text-xs text-muted-foreground">Appears when your first earnings post.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}