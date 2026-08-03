import { useMemo, useState } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/tabs";
import type { DashboardSummary } from "@zaminex/shared";
import { themeColor } from "@/lib/chart";
import { formatCurrency } from "@/lib/utils";

type Period = "7d" | "30d" | "90d";
const PERIOD_DAYS: Record<Period, number> = { "7d": 7, "30d": 30, "90d": 90 };

/** Area chart of total income over time, with a 7d/30d/90d period toggle. */
export function IncomeChartCard({ income }: { income: DashboardSummary["income"] }) {
  const [period, setPeriod] = useState<Period>("30d");

  // Slice the server series client-side. The server returns a 30-day set, so 7d
  // trims to the latest week; 30d/90d show everything available.
  const seriesData = useMemo(() => {
    const days = PERIOD_DAYS[period];
    return income.series.slice(-days);
  }, [income.series, period]);

  const hasData = seriesData.length > 0 && seriesData.some((s) => s.value > 0);

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
        categories: seriesData.map((s) => s.date),
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
    [seriesData],
  );

  const series = [{ name: "Total income", data: seriesData.map((s) => s.value) }];

  return (
    <Card className="flex flex-col">
      <CardHeader className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4 text-primary" /> Income over time
          </CardTitle>
          <SegmentedControl
            value={period}
            onValueChange={(v) => setPeriod(v as Period)}
            options={[
              { value: "7d", label: "7d" },
              { value: "30d", label: "30d" },
              { value: "90d", label: "90d" },
            ]}
          />
        </div>
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