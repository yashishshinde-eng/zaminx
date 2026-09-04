import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type LineData,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle } from "@/lib/market-types";
import type { IndicatorPoint, IndicatorSpec } from "@/lib/indicators";
import { formatChartTime, formatPriceGrouped, formatQty } from "@/lib/market-format";

// Professional dark trading-terminal palette. The chart canvas is a solid dark
// color matching the app's dark `--card` token (hsl(224 40% 7%) ≈ #0b0f19), so
// it blends seamlessly with the surrounding glass card while candles, axes,
// grid and indicators stay high-contrast and legible. These are native
// lightweight-charts theme options — NOT CSS — so the canvas/SVG rendering uses
// the dark theme directly.
const UP = "#22C55E"; // bright green — bullish candle bodies + borders
const DOWN = "#EF4444"; // bright red — bearish candle bodies + borders
const WICK_UP = "#2BD580"; // slightly brighter green — wicks stay visible when thin
const WICK_DOWN = "#F56565"; // slightly brighter red — wicks stay visible when thin
const ACCENT = "#3b82f6"; // blue — crosshair labels + live price line
const CROSSHAIR = "#8a98ac"; // muted slate — crosshair lines (visible but subtle)
const AXIS_TEXT = "#b8c2d0"; // light gray — price/time axis labels
const GRID = "#1b2233"; // subtle dark-gray — grid lines
const BORDER = "#26303f"; // axis borders
const CHART_BG = "#0b0f19"; // dark canvas — matches app dark --card

interface TooltipState {
  x: number;
  y: number;
  time: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

export function CandlestickChart({
  candles,
  liveCandleRef,
  indicators,
  specs,
}: {
  candles: Candle[];
  liveCandleRef: React.MutableRefObject<Candle | null>;
  indicators: Record<string, IndicatorPoint[]>;
  specs: IndicatorSpec[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const maSeriesRefs = useRef<Record<string, ISeriesApi<"Line">>>({});
  const priceLineRef = useRef<IPriceLine | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Create the chart once.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chart = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight,
      layout: {
        // Dark canvas matches the app's dark `--card` token — blends with the
        // surrounding glass card with no seam.
        background: { type: ColorType.Solid, color: CHART_BG },
        textColor: AXIS_TEXT,
        fontFamily: "Space Grotesk, Inter, sans-serif",
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: GRID },
        horzLines: { color: GRID },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        // Muted slate lines stay visible but never compete with the candles.
        // The price/time labels keep the bright ACCENT (blue) background so
        // values read cleanly against the dark canvas.
        vertLine: { color: `${CROSSHAIR}cc`, labelBackgroundColor: ACCENT, width: 1 },
        horzLine: { color: `${CROSSHAIR}cc`, labelBackgroundColor: ACCENT },
      },
      rightPriceScale: { borderColor: BORDER, scaleMargins: { top: 0.1, bottom: 0.22 } },
      timeScale: { borderColor: BORDER, timeVisible: true, secondsVisible: false },
      // Let the page scroll on touch devices: do not capture one-finger touch
      // drags for panning/scaling the chart. Pinch-zoom (two fingers) and all
      // mouse interactions (wheel, drag) are kept, so desktop is unaffected.
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: false,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: UP,
      downColor: DOWN,
      borderUpColor: UP,
      borderDownColor: DOWN,
      // Slightly brighter wicks keep thin candles (zoomed-out views) legible
      // against the dark canvas — bodies stay solid, edges stay crisp.
      wickUpColor: WICK_UP,
      wickDownColor: WICK_DOWN,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    for (const s of specs) {
      maSeriesRefs.current[s.key] = chart.addSeries(LineSeries, {
        color: s.color,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
    }

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    chart.subscribeCrosshairMove((param) => {
      const cs = candleSeriesRef.current;
      const vs = volumeSeriesRef.current;
      if (!param.point || !param.time || !cs) {
        setTooltip(null);
        return;
      }
      const c = param.seriesData.get(cs) as CandlestickData<UTCTimestamp> | undefined;
      const v = vs ? (param.seriesData.get(vs) as HistogramData<UTCTimestamp> | undefined) : undefined;
      setTooltip({
        x: param.point.x,
        y: param.point.y,
        time: typeof param.time === "number" ? param.time : null,
        open: c?.open ?? null,
        high: c?.high ?? null,
        low: c?.low ?? null,
        close: c?.close ?? null,
        volume: (v?.value as number) ?? null,
      });
    });

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) chart.applyOptions({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      maSeriesRefs.current = {};
      priceLineRef.current = null;
    };
  }, [specs]);

  // Bulk setData when the candle set changes (pair / timeframe switch / new bar close).
  useEffect(() => {
    const cs = candleSeriesRef.current;
    const vs = volumeSeriesRef.current;
    if (!cs || !vs) return;

    const candleData: CandlestickData<UTCTimestamp>[] = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    cs.setData(candleData);

    const volData: HistogramData<UTCTimestamp>[] = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      value: c.volume,
      color: c.close >= c.open ? `${UP}66` : `${DOWN}66`,
    }));
    vs.setData(volData);

    for (const s of specs) {
      const series = maSeriesRefs.current[s.key];
      const pts = indicators[s.key] ?? [];
      const lineData: LineData<UTCTimestamp>[] = [];
      for (const p of pts) {
        if (p.value !== null) lineData.push({ time: p.time as UTCTimestamp, value: p.value });
      }
      series?.setData(lineData);
    }

    chartRef.current?.timeScale().scrollToRealTime();
  }, [candles, indicators, specs]);

  // Live updates via rAF — bypass React state, mutate series directly.
  useEffect(() => {
    let raf = 0;
    let lastLinePrice = NaN;
    const loop = () => {
      const c = liveCandleRef.current;
      const cs = candleSeriesRef.current;
      const vs = volumeSeriesRef.current;
      if (c && cs && vs && Number.isFinite(c.time) && Number.isFinite(c.close)) {
        cs.update({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        });
        vs.update({
          time: c.time as UTCTimestamp,
          value: c.volume,
          color: c.close >= c.open ? `${UP}66` : `${DOWN}66`,
        });
        // Refresh the live price line only when the price actually moves.
        if (c.close !== lastLinePrice) {
          if (priceLineRef.current) cs.removePriceLine(priceLineRef.current);
          priceLineRef.current = cs.createPriceLine({
            price: c.close,
            color: ACCENT,
            lineStyle: LineStyle.Dashed,
            title: "Live",
            axisLabelVisible: true,
          });
          lastLinePrice = c.close;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [liveCandleRef]);

  const change =
    tooltip && tooltip.open !== null && tooltip.close !== null ? tooltip.close - tooltip.open : null;

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      {tooltip && tooltip.close !== null && (
        <div
          className="glass-card pointer-events-none absolute top-2 left-2 z-10 rounded-lg px-3 py-2 text-xs tabular-nums shadow-card"
          style={{ maxWidth: 220 }}
        >
          <div className="mb-1 text-muted-foreground">{formatChartTime(tooltip.time ?? NaN)}</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
            <span className="text-muted-foreground">O</span>
            <span className="text-right">{formatPriceGrouped(tooltip.open ?? NaN)}</span>
            <span className="text-muted-foreground">H</span>
            <span className="text-right text-success">{formatPriceGrouped(tooltip.high ?? NaN)}</span>
            <span className="text-muted-foreground">L</span>
            <span className="text-right text-destructive">{formatPriceGrouped(tooltip.low ?? NaN)}</span>
            <span className="text-muted-foreground">C</span>
            <span className="text-right">{formatPriceGrouped(tooltip.close ?? NaN)}</span>
            <span className="text-muted-foreground">Vol</span>
            <span className="text-right">{formatQty(tooltip.volume ?? NaN)}</span>
            <span className="text-muted-foreground">Δ</span>
            <span className={change !== null ? (change >= 0 ? "text-right text-success" : "text-right text-destructive") : "text-right"}>
              {change !== null ? `${change >= 0 ? "+" : ""}${change.toFixed(2)}` : "--"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}