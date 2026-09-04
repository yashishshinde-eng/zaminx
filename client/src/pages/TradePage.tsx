import { useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared";
import {
  CandlestickChart,
  ConnectionBadge,
  IndicatorLegend,
  MarketHeader,
  MarketList,
  PairSelector,
  RecentTrades,
  ReconnectingBanner,
  TimeframeBar,
  TradeError,
  TradeLoading,
} from "@/components/trade";
import { useActivePairStream } from "@/hooks/useActivePairStream";
import { useCandles } from "@/hooks/useCandles";
import { useMarketList } from "@/hooks/useMarketList";
import { useRecentTrades } from "@/hooks/useRecentTrades";
import { useTicker } from "@/hooks/useTicker";
import { latestIndicatorValues, MA_SPECS, computeIndicators } from "@/lib/indicators";
import {
  DEFAULT_TIMEFRAME,
  TIMEFRAMES,
  TRADE_PAIRS,
  TIMEFRAME_TO_BINANCE,
  type Timeframe,
  type TradePair,
} from "@/lib/market-types";

/**
 * /app/trade — display-only live crypto market dashboard.
 *
 * Real market data (candles, ticker, order book, trades, market list) from
 * Binance public REST + WebSocket. No buy/sell, no order placement, no wallet
 * integration — purely informative. See plan: peaceful-meandering-stearns.md.
 */
export function TradePage() {
  const [activePair, setActivePair] = useState<TradePair>(TRADE_PAIRS[0]);
  const [timeframe, setTimeframe] = useState<Timeframe>(DEFAULT_TIMEFRAME);

  const binanceInterval = TIMEFRAME_TO_BINANCE[timeframe];
  const symbol = activePair.symbol;

  // Single combined WS for the active pair; refs feed the consumers below.
  const { status: streamStatus, klineRef, tickerRef, tradeRef } =
    useActivePairStream(symbol, binanceInterval);

  // Separate long-lived WS for the market list.
  const marketList = useMarketList();

  const { candles, isLoading: candlesLoading, error: candlesError, liveCandleRef, refetch } =
    useCandles(symbol, binanceInterval, klineRef);
  const { ticker } = useTicker(symbol, tickerRef);
  const { trades } = useRecentTrades(symbol, tradeRef);

  const indicators = useMemo(() => computeIndicators(candles), [candles]);
  const indicatorValues = useMemo(() => latestIndicatorValues(candles), [candles]);

  const isReconnecting = streamStatus === "reconnecting" || streamStatus === "connecting";
  const showHardError = candlesError !== null && candles.length === 0;
  const showInitialLoading = candlesLoading && candles.length === 0;

  const handleSelectPair = (pair: TradePair) => {
    if (pair.symbol !== activePair.symbol) setActivePair(pair);
  };

  return (
    <AppShell>
      <PageHeader
        title="Trade"
        description="Live crypto markets — for display only."
        breadcrumbs={[
          { label: "Home", to: "/" },
          { label: "Dashboard", to: "/app" },
          { label: "Trade" },
        ]}
        actions={<ConnectionBadge status={streamStatus} />}
      />

      <div className="mt-6 space-y-4">
        <PairSelector
          pairs={TRADE_PAIRS}
          activeSymbol={symbol}
          onSelect={handleSelectPair}
        />

        {showInitialLoading ? (
          <TradeLoading />
        ) : showHardError ? (
          <TradeError onRetry={refetch} />
        ) : (
          <>
            {isReconnecting && <ReconnectingBanner />}

            {/* Desktop: market list | chart (chart is the main focus).
                Below xl, the columns stack — the live-rate header shows
                first, then the markets list, so order-* keeps xl's
                left/right layout while flipping the stacked order. */}
            <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
              {/* Center — header, timeframe, indicators, chart.
                  Below xl the columns stack; the chart uses explicit
                  responsive heights so it never collapses or grows
                  unpredictably. At xl the parent has a fixed height and the
                  chart flex-fills the remaining space. */}
              <div className="flex flex-col gap-4 xl:order-2 xl:h-[720px]">
                <MarketHeader
                  pair={activePair}
                  ticker={ticker}
                  status={streamStatus}
                  dimmed={isReconnecting}
                />

                <div className="glass-card flex flex-wrap items-center justify-between gap-3 p-3">
                  <TimeframeBar
                    timeframes={TIMEFRAMES}
                    active={timeframe}
                    onChange={setTimeframe}
                  />
                  <IndicatorLegend specs={MA_SPECS} values={indicatorValues} />
                </div>

                <div className="glass-card relative h-[420px] shrink-0 overflow-hidden p-2 sm:h-[500px] md:h-[560px] lg:h-[600px] xl:h-auto xl:min-h-0 xl:flex-1">
                  <CandlestickChart
                    candles={candles}
                    liveCandleRef={liveCandleRef}
                    indicators={indicators}
                    specs={MA_SPECS}
                  />
                </div>
              </div>

              {/* Left — market list (becomes a stacked card below the
                  live-rate header on mobile) */}
              <div className="xl:order-1 xl:h-[720px]">
                <MarketList
                  pairs={TRADE_PAIRS}
                  tickers={marketList.tickers}
                  activeSymbol={symbol}
                  onSelect={handleSelectPair}
                  status={marketList.status}
                  isLoading={marketList.isLoading}
                />
              </div>
            </div>

            {/* Below — recent trades */}
            <RecentTrades trades={trades} isLoading={false} />
          </>
        )}
      </div>
    </AppShell>
  );
}