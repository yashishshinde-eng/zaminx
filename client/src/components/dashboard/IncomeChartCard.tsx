import { useMemo, useState } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/tabs";
import { useCountUp } from "@/hooks/useCountUp";
import type { DashboardSummary } from "@zaminex/shared";
import { themeColor, baseChartOptions } from "@/lib/chart";
import { formatCurrency, cn } from "@/lib/utils";

type Period = "1h" | "24h" | "7d" | "30d" | "90d" | "1y";
const PERIOD_DAYS: Record<Period, number> = { "1h": 1, "24h": 1, "7d": 7, "30d": 30, "90d": 90, "1y": 365 };

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "1h", label: "1H" },
  { value: "24h", label: "24H" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "1y", label: "1Y" },
];

/**
 * Premium portfolio performance area chart — cinematic Binance-grade
 * visualization with gradient glow fill, gold peak accents, crosshair,
 * animated markers, and summary stats.
 */
export function IncomeChartCard({ income }: { income: DashboardSummary["income"] }) {
  const [period, setPeriod] = useState<Period>("30d");

  const seriesData = useMemo(() => {
    const days = PERIOD_DAYS[period];
    const sliced = income.series.slice(-days);
    // For 1h/24h we only have daily resolution, so show the most recent point(s)
    if (period === "1h") return income.series.length ? [income.series[income.series.length - 1]] : [];
    if (period === "24h") return income.series.length ? income.series.slice(-2) : [];
    return sliced;
  }, [income.series, period]);

  const hasData = seriesData.length > 0 && seriesData.some((s) => s.value > 0);

  // Summary stats for the period
  const periodTotal = seriesData.reduce((s, p) => s + p.value, 0);
  const periodMax = seriesData.length ? Math.max(...seriesData.map((s) => s.value)) : 0;
  const periodMin = seriesData.length ? Math.min(...seriesData.map((s) => s.value)) : 0;
  const animatedTotal = useCountUp(periodTotal, 800);

  // Trend: compare last half vs first half
  const trendPct = useMemo(() => {
    if (seriesData.length < 2) return 0;
    const mid = Math.floor(seriesData.length / 2);
    const first = seriesData.slice(0, mid).reduce((s, p) => s + p.value, 0);
    const second = seriesData.slice(mid).reduce((s, p) => s + p.value, 0);
    if (first === 0) return second > 0 ? 100 : 0;
    return ((second - first) / first) * 100;
  }, [seriesData]);

  // Find peak index for gold accent annotation
  const peakIndex = useMemo(() => {
    if (!seriesData.length) return -1;
    let maxVal = -Infinity;
    let idx = 0;
    seriesData.forEach((s, i) => {
      if (s.value > maxVal) {
        maxVal = s.value;
        idx = i;
      }
    });
    return idx;
  }, [seriesData]);

  const options: ApexOptions = useMemo(() => {
    const base = baseChartOptions(280);
    return {
      ...base,
      chart: {
        ...base.chart,
        type: "area",
      },
      colors: [themeColor("blue", "hsl(214 100% 52%)")],
      stroke: {
        curve: "smooth",
        width: 3,
        lineCap: "round",
      },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.45,
          opacityTo: 0.02,
          stops: [0, 50, 100],
          gradientToColors: [themeColor("blue", "hsl(214 100% 52%)")],
        },
      },
      grid: {
        ...base.grid,
        borderColor: themeColor("border", "hsl(224 20% 12%)"),
        strokeDashArray: 3,
        opacity: 0.3,
      },
      xaxis: {
        categories: seriesData.map((s) => s.date),
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: { colors: themeColor("muted-foreground", "hsl(215 20% 48%)"), fontSize: "11px", fontWeight: 500 },
          datetimeFormatter: { day: "dd MMM", month: "MMM yyyy" },
        },
        crosshairs: {
          show: true,
          stroke: { color: "hsl(var(--blue) / 0.3)", width: 1, dashArray: 4 },
          fill: {
            type: "gradient",
            gradient: {
              colorFrom: "hsl(var(--blue) / 0.1)",
              colorTo: "hsl(var(--blue) / 0)",
              stops: [0, 100],
              opacityFrom: 0.5,
              opacityTo: 0,
            },
          },
        },
      },
      yaxis: {
        labels: {
          style: { colors: themeColor("muted-foreground", "hsl(215 20% 48%)"), fontSize: "11px", fontWeight: 500 },
          formatter: (v: number) => formatCurrency(v),
          offsetX: -5,
        },
        tickAmount: 5,
      },
      tooltip: {
        ...base.tooltip,
        y: { formatter: (v: number) => formatCurrency(v) },
        x: { formatter: (v: number) => `Day ${v}` },
        custom: undefined,
      },
      markers: {
        size: 0,
        hover: { size: 6, sizeOffset: 3 },
        strokeColors: "hsl(var(--card))",
        strokeWidth: 3,
        discrete: peakIndex >= 0
          ? [{
              seriesIndex: 0,
              dataPointIndex: peakIndex,
              fillColor: "hsl(var(--gold))",
              strokeColor: "hsl(var(--card))",
              size: 5,
              strokeWidth: 2,
            }]
          : [],
      },
      annotations: peakIndex >= 0
        ? {
            points: [{
              x: seriesData[peakIndex]?.date,
              seriesIndex: 0,
              marker: {
                size: 6,
                fillColor: "hsl(var(--gold))",
                strokeColor: "hsl(var(--card))",
                strokeWidth: 2,
              },
              label: {
                text: formatCurrency(periodMax),
                style: {
                  color: "#fff",
                  background: "linear-gradient(135deg, hsl(var(--gold)), hsl(var(--blue)))",
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: { left: 8, right: 8, top: 4, bottom: 4 },
                  borderRadius: 6,
                },
              },
            }],
          }
        : {},
      responsive: [{ breakpoint: 640, options: { chart: { height: 220 } } }],
    };
  }, [seriesData, peakIndex, periodMax]);

  const series = [{ name: "Earnings", data: seriesData.map((s) => s.value) }];

  const TrendIcon = trendPct > 0 ? TrendingUp : trendPct < 0 ? TrendingDown : Minus;
  const trendColor = trendPct >= 0 ? "text-success" : "text-destructive";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="premium-chart-panel card-glow-animate hover-lift flex flex-col overflow-hidden">
        {/* Premium gradient border at top */}
        <div
          className="h-[2px] w-full shrink-0"
          style={{
            background: "linear-gradient(90deg, hsl(var(--blue)), hsl(var(--gold)), hsl(var(--purple)))",
          }}
        />

        <CardHeader className="space-y-3 pb-2">
          {/* Title row with icon + segmented period filter */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2.5 text-base font-grotesk">
              <div className="icon-box-blue">
                <TrendingUp className="size-4 text-gold" />
              </div>
              Portfolio Performance
            </CardTitle>
            <SegmentedControl
              value={period}
              onValueChange={(v) => setPeriod(v as Period)}
              options={PERIOD_OPTIONS}
            />
          </div>

          {/* Summary stats row */}
          {hasData && (
            <div className="flex flex-wrap items-center gap-4">
              <div className="space-y-0.5">
                <p className="metric-label">Period Total</p>
                <p className="metric-value text-xl">{formatCurrency(animatedTotal)}</p>
              </div>
              <div className="h-8 w-px bg-white/[0.06]" />
              <div className="space-y-0.5">
                <p className="metric-label">Peak</p>
                <p className="text-sm font-semibold tabular-nums">{formatCurrency(periodMax)}</p>
              </div>
              <div className="h-8 w-px bg-white/[0.06]" />
              <div className="space-y-0.5">
                <p className="metric-label">Low</p>
                <p className="text-sm font-semibold tabular-nums">{formatCurrency(periodMin)}</p>
              </div>
              <div className="h-8 w-px bg-white/[0.06]" />
              <div className="space-y-0.5">
                <p className="metric-label">Trend</p>
                <div className={cn("flex items-center gap-1 text-sm font-semibold tabular-nums", trendColor)}>
                  {trendPct >= 0 ? "+" : ""}{trendPct.toFixed(1)}%
                  <TrendIcon className="size-3.5" />
                </div>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="relative flex-1 pt-2">
          {hasData ? (
            <Chart options={options} series={series} type="area" height={280} />
          ) : (
            <div className="flex h-[280px] flex-col items-center justify-center text-center">
              {/* Premium glass illustration placeholder */}
              <div className="relative">
                <div
                  className="flex size-16 items-center justify-center rounded-full"
                  style={{
                    background: "linear-gradient(135deg, hsl(var(--blue) / 0.2), hsl(var(--gold) / 0.15), hsl(var(--purple) / 0.2))",
                    boxShadow: "0 0 32px -4px hsl(var(--blue) / 0.15), 0 0 48px -8px hsl(var(--gold) / 0.1)",
                  }}
                >
                  <TrendingUp className="size-7 text-muted-foreground/60" />
                </div>
              </div>
              <p className="mt-4 text-sm font-semibold text-foreground/80">No data yet</p>
              <p className="mt-1.5 max-w-[220px] text-xs text-muted-foreground">
                Your portfolio performance chart will appear once you start generating income.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}