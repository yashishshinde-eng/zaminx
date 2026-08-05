import { useMemo, useState } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { motion } from "framer-motion";
import { PieChart } from "lucide-react";
import type { DashboardSummary } from "@zaminex/shared";
import { themeColor, DONUT_COLORS, baseChartOptions } from "@/lib/chart";
import { formatCurrency, cn } from "@/lib/utils";

/** Premium donut chart of income streams with interactive legend and center total. */
export function IncomeDistributionCard({ income }: { income: DashboardSummary["income"] }) {
  const allStreams = useMemo(
    () => [
      { label: "Trading", value: income.trading, color: DONUT_COLORS[0] },
      { label: "Direct", value: income.direct, color: DONUT_COLORS[1] },
      { label: "Team", value: income.team, color: DONUT_COLORS[2] },
      { label: "Community", value: income.community, color: DONUT_COLORS[3] },
      { label: "Rank", value: income.rankReward, color: DONUT_COLORS[4] },
      { label: "Bonanza", value: income.bonanza, color: DONUT_COLORS[5] },
    ],
    [income.trading, income.direct, income.team, income.community, income.rankReward, income.bonanza],
  );
  const hasAnyData = allStreams.some((s) => s.value > 0);
  const total = allStreams.reduce((sum, s) => sum + s.value, 0);

  const [active, setActive] = useState<Set<number>>(() => new Set(allStreams.map((_, i) => i)));
  const visibleStreams = allStreams.filter((_, i) => active.has(i));

  const toggleLegend = (i: number) => {
    setActive((prev) => {
      if (prev.size === 1 && prev.has(i)) return new Set(allStreams.map((_, idx) => idx));
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      if (next.size === 0) return new Set(allStreams.map((_, idx) => idx));
      return next;
    });
  };

  const options: ApexOptions = useMemo(() => {
    const base = baseChartOptions(220);
    return {
      ...base,
      chart: {
        ...base.chart,
        type: "donut",
        height: 220,
      },
      labels: visibleStreams.map((s) => s.label),
      colors: visibleStreams.map((s) => s.color),
      stroke: {
        width: 4,
        colors: [themeColor("card", "hsl(224 40% 7%)")],
        lineCap: "round",
      },
      legend: { show: false },
      dataLabels: { enabled: false },
      plotOptions: {
        pie: {
          donut: {
            size: "68%",
            labels: {
              show: true,
              name: {
                show: true,
                fontSize: "11px",
                fontFamily: "Space Grotesk, Inter, sans-serif",
                fontWeight: 600,
                color: themeColor("muted-foreground", "hsl(215 20% 48%)"),
              },
              value: {
                show: true,
                fontSize: "16px",
                fontFamily: "Space Grotesk, Inter, sans-serif",
                fontWeight: 700,
                color: themeColor("foreground", "hsl(210 40% 96%)"),
                formatter: (v: string) => formatCurrency(Number(v)),
              },
              total: {
                show: true,
                label: "Total",
                fontSize: "11px",
                fontFamily: "Space Grotesk, Inter, sans-serif",
                fontWeight: 500,
                color: themeColor("muted-foreground", "hsl(215 20% 48%)"),
                formatter: () => formatCurrency(total),
              },
            },
          },
          expandOnClick: true,
        },
      },
      tooltip: {
        ...base.tooltip,
        y: { formatter: (v: number) => formatCurrency(v) },
        fillSeriesColor: false,
      },
      responsive: [{ breakpoint: 640, options: { chart: { height: 200 } } }],
    };
  }, [visibleStreams, total]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card glass-card-hover relative overflow-hidden"
    >
      {/* Title row */}
      <div className="flex items-center gap-3 p-5 pb-0">
        <div className="icon-box-blue">
          <PieChart className="size-4 text-gold" />
        </div>
        <h3 className="section-title">Income Distribution</h3>
      </div>

      {/* Chart + Legend */}
      <div className="p-5">
        {hasAnyData ? (
          <div className="flex flex-col items-center gap-5">
            <div className="relative">
              <Chart options={options} series={visibleStreams.map((s) => s.value)} type="donut" height={220} />
            </div>

            {/* Interactive legend as glass pills */}
            <div className="grid w-full grid-cols-2 gap-2.5">
              {allStreams.map((s, i) => {
                const isVisible = active.has(i);
                const pct = total > 0 ? (s.value / total) * 100 : 0;
                return (
                  <motion.button
                    key={s.label}
                    type="button"
                    onClick={() => toggleLegend(i)}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.05 }}
                    aria-pressed={isVisible}
                    className={cn(
                      "group relative flex flex-col gap-1.5 rounded-[14px] border px-3.5 py-3 text-left transition-all duration-300",
                      isVisible
                        ? "border-white/[0.08] bg-white/[0.02] backdrop-blur-xl hover:border-white/[0.14] hover:bg-white/[0.04]"
                        : "border-transparent opacity-40 hover:opacity-70",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full ring-2 ring-offset-1 ring-offset-card"
                          style={{ backgroundColor: s.color, boxShadow: `0 0 0 2px ${s.color}` }}
                        />
                        <span className="min-w-0 truncate text-xs font-semibold">{s.label}</span>
                      </div>
                      <span className="shrink-0 text-xs font-bold tabular-nums text-muted-foreground">
                        {formatCurrency(s.value)}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: isVisible ? s.color : "transparent",
                          opacity: isVisible ? 0.8 : 0.2,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-medium tabular-nums text-muted-foreground">
                      {pct.toFixed(1)}%
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex h-[280px] flex-col items-center justify-center text-center">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-white/[0.03] backdrop-blur-xl"
              style={{ boxShadow: "0 0 32px -8px hsl(var(--blue) / 0.15), inset 0 1px 0 0 rgba(255,255,255,0.06)" }}
            >
              <PieChart className="size-8 text-muted-foreground/50" />
            </div>
            <p className="mt-4 text-sm font-semibold">No data yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Your income streams will appear once you start earning.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}