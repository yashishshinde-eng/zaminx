import { useMemo } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { themeColor } from "@/lib/chart";
import { formatCurrency } from "@/lib/utils";

/** A summary stat tile (Records / Total / …). */
export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

/**
 * A daily-series area chart card. Shared by the user Reports page and the admin
 * Reports page. `title` is the chart heading and the series name; `description`
 * is the sub-heading (e.g. "Daily total").
 */
export function ReportChartCard({
  title,
  description,
  series,
}: {
  title: string;
  description: string;
  series: { date: string; value: number }[];
}) {
  const hasData = series.length > 0;
  const options: ApexOptions = useMemo(
    () => ({
      chart: { type: "area", height: 200, toolbar: { show: false }, background: "transparent", fontFamily: "inherit" },
      colors: [themeColor("primary", "hsl(222 47% 45%)")],
      stroke: { curve: "smooth", width: 2 },
      dataLabels: { enabled: false },
      grid: { borderColor: themeColor("border", "hsl(214 32% 91%)"), strokeDashArray: 4 },
      xaxis: {
        categories: series.map((s) => s.date),
        labels: { style: { colors: themeColor("muted-foreground", "#64748b") } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { labels: { style: { colors: themeColor("muted-foreground", "#64748b") }, formatter: (v: number) => formatCurrency(v) } },
      fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 100] } },
      tooltip: { theme: "light", y: { formatter: (v: number) => formatCurrency(v) } },
    }),
    [series],
  );
  const chartSeries = [{ name: title, data: series.map((s) => s.value) }];

  return (
    <Card className="flex flex-col">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="size-4 text-primary" /> {title} over time
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="relative flex-1">
        {hasData ? (
          <Chart options={options} series={chartSeries} type="area" height={200} />
        ) : (
          <div className="flex h-[200px] flex-col items-center justify-center text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <TrendingUp className="size-5" />
            </div>
            <p className="mt-2 text-sm font-medium">No data in range</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}