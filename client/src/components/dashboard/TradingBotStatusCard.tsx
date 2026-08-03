import { motion } from "framer-motion";
import { Bot } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkline } from "./Sparkline";
import { useCountUp } from "@/hooks/useCountUp";
import { formatCurrency } from "@/lib/utils";
import type { DashboardSummary } from "@zaminex/shared";

/**
 * Blueprint section 3 — Trading Bot Status. Honest, real-data card: the bot is
 * shown "Active" when the user holds an active package, else "Idle". The
 * headline figure is the real trading-income total and the sparkline is the
 * real 30-day income series. No fabricated yield percentages or bot telemetry.
 */
export function TradingBotStatusCard({ data }: { data: DashboardSummary }) {
  const active = data.package.active;
  const trading = useCountUp(data.income.trading, 1000);
  const series = data.income.series.map((s) => s.value);

  return (
    <Card className="card-hover flex h-full flex-col overflow-hidden">
      <CardContent className="flex h-full flex-col p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="brand-gradient flex size-10 shrink-0 items-center justify-center rounded-lg text-primary-foreground shadow-sm">
              <Bot className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Trading Bot</p>
              <p className="text-xs text-muted-foreground">Auto-yield engine</p>
            </div>
          </div>
          <StatusPill active={active} />
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium text-muted-foreground">Trading income</p>
          <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{formatCurrency(trading)}</p>
        </div>

        <div className="mt-auto pt-3">
          {series.length > 0 ? (
            <Sparkline data={series} height={44} />
          ) : (
            <p className="text-xs text-muted-foreground">{active ? "Earnings will appear once yield is credited." : "Activate a package to start the bot."}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
      }`}
    >
      <motion.span
        className="size-1.5 rounded-full bg-current"
        animate={active ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
        transition={active ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : undefined}
      />
      {active ? "Active" : "Idle"}
    </span>
  );
}