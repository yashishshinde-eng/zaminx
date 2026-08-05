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
 * Premium sparkline — tiny axis-less area chart for KPI tiles.
 * Gold glow drop shadow, gradient fill (blue to transparent), smooth curve,
 * and entrance animation. Returns null when data is all-zero.
 */
export function Sparkline({ data, colorVar = "primary", fallback = "hsl(45 100% 48%)", height = 40, className }: SparklineProps) {
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
        fontFamily: "Space Grotesk, Inter, ui-sans-serif, system-ui, sans-serif",
        animations: { enabled: hasData, easing: "easeinout", speed: 600, dynamicAnimation: { enabled: true, speed: 400 } },
        dropShadow: {
          enabled: true,
          top: 4,
          left: 0,
          blur: 8,
          opacity: 0.35,
          color,
        },
      },
      colors: [color],
      stroke: {
        curve: "smooth",
        width: 2.5,
      },
      dataLabels: { enabled: false },
      grid: { show: false, padding: { left: 0, right: 0, top: 0, bottom: 0 } },
      tooltip: { enabled: false },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.45,
          opacityTo: 0.02,
          stops: [0, 50, 100],
          gradientToColors: [color],
        },
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