import { useMemo } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import { themeColor } from "@/lib/chart";

interface SparklineProps {
  data: number[];
  /** CSS var name (without `--`) for the line color; defaults to primary. */
  colorVar?: string;
  fallback?: string;
  height?: number;
  className?: string;
}

/**
 * A tiny axis-less area chart for KPI tiles. Reuses the `lib/chart` theme-aware
 * colour convention. Renders nothing when the data is all-zero/empty so the
 * tile stays clean until real earnings exist.
 */
export function Sparkline({ data, colorVar = "primary", fallback = "hsl(250 84% 54%)", height = 40, className }: SparklineProps) {
  const color = themeColor(colorVar, fallback);
  const hasData = data.some((v) => v > 0);

  const options: ApexOptions = useMemo(
    () => ({
      chart: {
        type: "area",
        height,
        sparkline: { enabled: true },
        toolbar: { show: false },
        background: "transparent",
        fontFamily: "inherit",
        animations: { enabled: hasData, speed: 600 },
      },
      colors: [color],
      stroke: { curve: "smooth", width: 2 },
      dataLabels: { enabled: false },
      grid: { show: false, padding: { left: 0, right: 0, top: 0, bottom: 0 } },
      tooltip: { enabled: false },
      fill: {
        type: "gradient",
        gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0, stops: [0, 100] },
      },
      plotOptions: { area: { fillTo: "origin" } },
      yaxis: { show: false },
      xaxis: { show: false, labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
    }),
    [color, height, hasData],
  );

  if (!hasData) return null;

  return (
    <div className={className} style={{ height }}>
      <Chart options={options} series={[{ data }]} type="area" height={height} />
    </div>
  );
}