import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  Wallet as WalletIcon,
  ArrowDownToLine,
  ArrowUpFromLine,
  Rocket,
  Crown,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  Copy,
  Check,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useCountUp } from "@/hooks/useCountUp";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";
import type { DashboardSummary } from "@zaminex/shared";

/* ═══════════════════════════════════════════════════════════════════════
 *  Static fallback data — used when backend values are zero/missing
 *  so the design can be previewed. Will be commented out later.
 * ═══════════════════════════════════════════════════════════════════════ */
const FALLBACK = {
  totalBalance: 12_450.75,
  todayEarnings: 86.32,
  packageName: "Gold Plan",
  rankName: "Gold",
  referralCode: "ZAM-X9K2",
  referralLink: "https://zaminex.com/ref/ZAM-X9K2",
};

/* ── Entrance animation variants ──────────────────────────────── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

/* ── Quick action definitions ─────────────────────────────────── */
const actions = [
  { label: "Deposit", to: "/app/packages", icon: ArrowDownToLine, gradient: "from-blue-500/20 to-blue-600/10" },
  { label: "Withdraw", to: "/app/withdrawals", icon: ArrowUpFromLine, gradient: "from-purple-500/20 to-purple-600/10" },
  { label: "Invest", to: "/app/packages", icon: Rocket, gradient: "from-gold/20 to-yellow-600/10" },
] as const;

/**
 * Premium cinematic portfolio hero — crypto exchange quality.
 * Animated gradient border, floating orbs, gold accents, glass pills.
 * Falls back to static data when backend values are zero/missing.
 */
export function HeroPortfolioCard({ data }: { data: DashboardSummary }) {
  const prefersReduced = useReducedMotion();
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  // Use real data, fall back to static when zero/empty
  const totalBalance = data.wallets.total || FALLBACK.totalBalance;
  const todayEarnings =
    data.income.series.length > 0
      ? data.income.series[data.income.series.length - 1].value
      : FALLBACK.todayEarnings;
  const packageName =
    data.package.active && data.package.name ? data.package.name : FALLBACK.packageName;
  const rankName = data.account.rank.name || FALLBACK.rankName;
  const referralLink = data.referral.link || FALLBACK.referralLink;
  const referralCode = data.referral.code || FALLBACK.referralCode;

  const animatedBalance = useCountUp(totalBalance, 1200);
  const todayUp = todayEarnings >= 0;

  // Calculate trend percentage (relative to total balance, capped at ±99.9%)
  const todayPercent = totalBalance > 0
    ? Math.min(Math.max((todayEarnings / totalBalance) * 100, -99.9), 99.9)
    : 0;
  const displayPercent = Math.abs(todayPercent).toFixed(2);

  const copyReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Referral link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  // Floating ambient orbs — blue→purple radial with gold accent
  const orbs = [
    { size: 340, left: "-12%", top: "-18%", dur: 14, delay: 0, color: "var(--blue)", opacity: 0.25 },
    { size: 260, left: "68%", top: "-12%", dur: 17, delay: 1.5, color: "var(--purple)", opacity: 0.22 },
    { size: 380, left: "72%", top: "40%", dur: 20, delay: 0.8, color: "var(--blue-dark)", opacity: 0.20 },
    { size: 180, left: "10%", top: "55%", dur: 12, delay: 2.5, color: "var(--gold)", opacity: 0.15 },
    { size: 140, left: "40%", top: "75%", dur: 11, delay: 1, color: "var(--purple-light)", opacity: 0.12 },
  ];

  return (
    <motion.div
      className="premium-hero-panel card-shimmer card-glow-animate gradient-border-animated relative"
      initial="hidden"
      animate="visible"
      variants={prefersReduced ? undefined : containerVariants}
    >
      {/* ── Background layers ────────────────────────────────── */}
      {/* Base card fill */}
      <div className="absolute inset-0 bg-[hsl(var(--card))]" />
      {/* Blue→purple radial with gold accent highlights */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_15%_-10%,hsl(var(--blue)/0.18),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_85%_10%,hsl(var(--purple)/0.14),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_50%_90%,hsl(var(--gold)/0.08),transparent_50%)]" />
      {/* Bottom-left purple glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_5%_100%,hsl(var(--purple)/0.10),transparent_55%)]" />
      {/* Subtle grid */}
      <div className="absolute inset-0 grid-pattern opacity-[0.12]" />

      {/* Floating ambient orbs */}
      {orbs.map((orb, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.left,
            top: orb.top,
            background: `radial-gradient(circle, hsl(${orb.color} / ${orb.opacity}), transparent 70%)`,
          }}
          animate={
            prefersReduced
              ? undefined
              : { y: [0, -14, 0], opacity: [orb.opacity * 0.7, orb.opacity * 1.2, orb.opacity * 0.7] }
          }
          transition={{ duration: orb.dur, repeat: Infinity, ease: "easeInOut", delay: orb.delay }}
        />
      ))}

      {/* Gold accent line at top */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

      {/* ── Content ──────────────────────────────────────────── */}
      <div className="relative px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
        <div className="flex flex-col gap-6">

          {/* ── Row 1: Balance section ────────────────────── */}
          <motion.div className="flex flex-col gap-3" variants={prefersReduced ? undefined : itemVariants}>
            {/* Label + visibility toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="icon-box-gold size-7">
                  <WalletIcon className="size-3.5 text-gold" />
                </div>
                <span className="metric-label text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Total Balance
                </span>
              </div>
              <button
                type="button"
                onClick={() => setBalanceVisible((v) => !v)}
                className="inline-flex items-center justify-center size-8 rounded-full border border-white/[0.08] bg-white/[0.03] text-muted-foreground transition-all duration-200 hover:bg-white/[0.08] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label={balanceVisible ? "Hide balance" : "Show balance"}
              >
                {balanceVisible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>

            {/* Balance amount */}
            <div className="relative">
              <motion.p
                className="metric-value-lg text-3xl sm:text-4xl lg:text-5xl font-grotesk text-gradient-gold stat-glow"
                initial={false}
                animate={{ opacity: balanceVisible ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              >
                {formatCurrency(animatedBalance)}
              </motion.p>
              <motion.p
                className="absolute inset-0 metric-value-lg text-3xl sm:text-4xl lg:text-5xl font-grotesk text-foreground/30"
                initial={false}
                animate={{ opacity: balanceVisible ? 0 : 1 }}
                transition={{ duration: 0.3 }}
              >
                {"••••••••"}
              </motion.p>
            </div>

            {/* Today's earnings pill + membership badge */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Today's earnings pill */}
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur-md transition-colors ${
                  todayUp
                    ? "border-success/20 bg-success/10 text-success"
                    : "border-destructive/20 bg-destructive/10 text-destructive"
                }`}
              >
                {todayUp ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                <span>{todayUp ? "+" : "−"}{formatCurrency(Math.abs(todayEarnings))}</span>
                <span className="opacity-60">today</span>
                <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  todayUp ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                }`}>
                  {todayUp ? "+" : ""}{displayPercent}%
                </span>
              </span>

              {/* Membership badge — crown + rank */}
              <span className="chip-gold inline-flex items-center gap-1.5">
                <Crown className="size-3.5 text-gold" />
                {rankName}
              </span>

              {/* Package badge */}
              {/* <span className="chip-blue inline-flex items-center gap-1.5">
                <WalletIcon className="size-3" />
                {packageName}
              </span> */}
            </div>
          </motion.div>

          {/* ── Row 2: Quick actions ──────────────────────── */}
          <motion.div
            className="grid grid-cols-4 gap-2 sm:gap-3"
            variants={prefersReduced ? undefined : itemVariants}
          >
            {actions.map((a) => (
              <Link
                key={a.label}
                to={a.to}
                className="group flex flex-col items-center justify-center gap-2 rounded-[16px] border border-white/[0.06] bg-white/[0.02] p-3.5 text-sm font-medium text-foreground/70 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-blue/20 hover:bg-white/[0.05] hover:text-foreground sm:p-4"
              >
                <div className={`flex size-9 items-center justify-center rounded-xl bg-gradient-to-br ${a.gradient} transition-all duration-300 group-hover:shadow-[0_0_16px_-4px_hsl(var(--blue)/0.25)]`}>
                  <a.icon className="size-4 text-foreground/80 group-hover:text-foreground" />
                </div>
                <span className="text-xs sm:text-sm">{a.label}</span>
              </Link>
            ))}

            {/* Refer button — copy referral */}
            <button
              type="button"
              onClick={copyReferral}
              className="group flex flex-col items-center justify-center gap-2 rounded-[16px] border border-white/[0.06] bg-white/[0.02] p-3.5 text-sm font-medium text-foreground/70 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/20 hover:bg-gold/[0.04] hover:text-foreground sm:p-4"
            >
              <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-gold/20 to-yellow-600/10 transition-all duration-300 group-hover:shadow-[0_0_16px_-4px_hsl(var(--gold)/0.25)]">
                <Users className="size-4 text-foreground/80 group-hover:text-gold" />
              </div>
              <span className="text-xs sm:text-sm">Refer</span>
            </button>
          </motion.div>

          {/* ── Row 3: Referral code section ──────────────── */}
          <motion.div
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
            variants={prefersReduced ? undefined : itemVariants}
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
              Referral code
            </span>
            <div className="flex items-center gap-2 flex-1">
              <div className="glass-input flex items-center gap-2 px-3 py-2 flex-1 min-w-0">
                <code className="font-mono text-sm font-semibold tracking-wider text-gradient-gold truncate">
                  {referralCode}
                </code>
              </div>
              <button
                type="button"
                onClick={copyReferral}
                className="inline-flex items-center justify-center gap-1.5 rounded-[12px] border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-foreground/70 backdrop-blur-sm transition-all duration-200 hover:border-blue/20 hover:bg-white/[0.08] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label="Copy referral link"
              >
                {copied ? (
                  <><Check className="size-3.5 text-success" /> <span className="text-success">Copied</span></>
                ) : (
                  <><Copy className="size-3.5" /> <span>Copy</span></>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}