import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  Wallet as WalletIcon,
  ArrowDownToLine,
  ArrowUpFromLine,
  Rocket,
  Link2,
  Package as PackageIcon,
  Award,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCountUp } from "@/hooks/useCountUp";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";
import type { DashboardSummary } from "@zaminex/shared";

/**
 * Hero Portfolio Card — the showpiece of the user dashboard.
 * Features a gold-to-blue brand gradient, floating particles, animated count-up,
 * and quick action buttons. All figures come from the real DashboardSummary.
 */
export function HeroPortfolioCard({ data }: { data: DashboardSummary }) {
  const prefersReduced = useReducedMotion();
  const balance = useCountUp(data.wallets.total, 1000);
  const today = data.income.series.length ? data.income.series[data.income.series.length - 1].value : 0;
  const todayUp = today >= 0;

  const actions = [
    { label: "Deposit", to: "/app/packages", icon: ArrowDownToLine },
    { label: "Withdraw", to: "/app/withdrawals", icon: ArrowUpFromLine },
    { label: "Invest", to: "/app/packages", icon: Rocket },
  ] as const;

  const particles = [
    { size: 96, left: "8%", top: "20%", dur: 7, delay: 0 },
    { size: 64, left: "62%", top: "12%", dur: 9, delay: 0.6 },
    { size: 120, left: "78%", top: "55%", dur: 11, delay: 0.3 },
    { size: 48, left: "30%", top: "70%", dur: 8, delay: 0.9 },
  ];

  return (
    <Card className="card-hover card-shimmer relative overflow-hidden border-0">
      {/* Brand gradient base */}
      <div className="brand-gradient absolute inset-0" />
      {/* Soft radial sheen for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_80%_0%,rgba(255,255,255,0.22),transparent_55%)]" />
      {/* Subtle glass overlay */}
      <div className="absolute inset-0 backdrop-blur-[1px]" />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute rounded-full bg-white/25 blur-2xl"
          style={{ width: p.size, height: p.size, left: p.left, top: p.top }}
          animate={prefersReduced ? undefined : { y: [0, -14, 0], opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: p.dur, repeat: Infinity, ease: "easeInOut", delay: p.delay }}
        />
      ))}

      <div className="relative p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          {/* Balance + chips */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary-foreground/80">
              <WalletIcon className="size-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Portfolio Balance</span>
            </div>
            <div>
              <p className="text-4xl font-bold tracking-tight tabular-nums text-primary-foreground sm:text-5xl">
                {formatCurrency(balance)}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-primary-foreground backdrop-blur">
                <TrendingUp className="size-3.5" />
                {todayUp ? "+" : "−"}
                {formatCurrency(Math.abs(today))} today
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Chip icon={PackageIcon} label={data.package.active && data.package.name ? data.package.name : "No package"} />
              <Chip icon={Award} label={data.account.rank.name} />
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            {actions.map((a) => (
              <Button key={a.label} asChild size="sm" variant="outline" className="border-white/25 bg-white/10 text-primary-foreground hover:bg-white/20 hover:text-primary-foreground backdrop-blur-sm">
                <Link to={a.to}>
                  <a.icon className="size-4" /> {a.label}
                </Link>
              </Button>
            ))}
            <Button
              size="sm"
              variant="outline"
              className="border-white/25 bg-white/10 text-primary-foreground hover:bg-white/20 hover:text-primary-foreground backdrop-blur-sm"
              onClick={() => {
                navigator.clipboard.writeText(data.referral.link).then(
                  () => toast.success("Referral link copied"),
                  () => toast.error("Couldn't copy"),
                );
              }}
            >
              <Link2 className="size-4" /> Refer
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Chip({ icon: Icon, label }: { icon: typeof PackageIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-primary-foreground backdrop-blur">
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}