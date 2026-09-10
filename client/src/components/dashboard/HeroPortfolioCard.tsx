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
import { useTranslation } from "react-i18next";
import { useCountUp } from "@/hooks/useCountUp";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";
import { RankStars } from "./RankStars";
import { NeonActionButton } from "@/components/ui/neon";
import type { DashboardSummary } from "@zeminex/shared";

/* ═══════════════════════════════════════════════════════════════════════
 *  Static fallback data — used when backend values are zero/missing
 *  so the design can be previewed. Will be commented out later.
 * ═══════════════════════════════════════════════════════════════════════ */
const FALLBACK = {
  totalBalance: 0,
  todayEarnings: 0,
  packageName: "Gold Plan",
  rankName: "Gold",
  referralCode: "ZAM-X9K2",
  referralLink: "https://zeminexglobal.com/ref/ZAM-X9K2",
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

/* ── Hero quick actions — preserve existing routes exactly ────── */
const heroActions = [
  { id: "deposit", labelKey: "dashboard.actions.deposit", to: "/app/packages", icon: ArrowDownToLine, variant: "gold" },
  { id: "withdraw", labelKey: "dashboard.actions.withdraw", to: "/app/withdrawals", icon: ArrowUpFromLine, variant: "green" },
  { id: "invest", labelKey: "dashboard.actions.invest", to: "/app/packages", icon: Rocket, variant: "violet" },
] as const;

/**
 * Premium cinematic portfolio hero — "Living Neon Wallet" edition.
 * Gold animated neon border, energy glow behind the balance, glowing
 * number, and 3D neon action cards. Falls back to static data when
 * backend values are zero/missing. All data/logic/referral behavior
 * is unchanged from the previous version.
 */
export function HeroPortfolioCard({ data }: { data: DashboardSummary }) {
  const { t } = useTranslation();
  const prefersReduced = useReducedMotion();
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  // Use real data, fall back to static when zero/empty
  const totalBalance = data.wallets.total || FALLBACK.totalBalance;
  // Total of all income streams (trading + direct + team + community + rankReward + bonanza)
  const todayEarnings = data.income.total || FALLBACK.todayEarnings;
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
      toast.success(t("heroCard.referralLinkCopied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("heroCard.couldNotCopy"));
    }
  };

  return (
    <motion.div
      className="neon-card neon-gold card-shimmer relative overflow-hidden"
      initial="hidden"
      animate="visible"
      variants={prefersReduced ? undefined : containerVariants}
    >
      {/* ── Background: inner radial sheen overlay, same as other neon cards ── */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[22px]"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 15% 10%, rgba(255,255,255,0.05), transparent 60%)",
        }}
      />

      {/* Gold accent line at top */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

      {/* ── Content ──────────────────────────────────────────── */}
      <div className="relative z-10 px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
        <div className="flex flex-col gap-6">

          {/* ── Row 1: Balance section (hero) ──────────────── */}
          <motion.div className="relative flex flex-col gap-3" variants={prefersReduced ? undefined : itemVariants}>
            {/* Label + visibility toggle */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="icon-box-gold size-7">
                  <WalletIcon className="size-3.5 text-gold" />
                </div>
                <span className="metric-label text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  {t("dashboard.totalBalance")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setBalanceVisible((v) => !v)}
                className="inline-flex items-center justify-center size-8 rounded-full border border-white/[0.08] bg-white/[0.03] text-muted-foreground transition-all duration-200 hover:bg-white/[0.08] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                aria-label={balanceVisible ? t("heroCard.hideBalance") : t("heroCard.showBalance")}
              >
                {balanceVisible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>

            {/* Balance amount — premium glowing number */}
            <div className="relative z-10">
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
            <div className="relative z-10 flex flex-wrap items-center gap-2.5">
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
                <span className="opacity-60">{t("heroCard.today")}</span>
                <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  todayUp ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                }`}>
                  {todayUp ? "+" : ""}{displayPercent}%
                </span>
              </span>

              {/* Membership badge — crown + rank + star level */}
              <span className="chip-gold inline-flex items-center gap-1.5">
                <Crown className="size-3.5 text-gold" />
                {rankName}
                <RankStars name={rankName} size={10} className="ml-0.5" />
              </span>
            </div>
          </motion.div>

          {/* ── Row 2: Quick actions — 3D neon action cards ──── */}
          <motion.div
            className="grid grid-cols-4 gap-2 sm:gap-3"
            variants={prefersReduced ? undefined : itemVariants}
          >
            {heroActions.map((a) => (
              <NeonActionButton
                key={a.id}
                icon={a.icon}
                label={t(a.labelKey)}
                variant={a.variant}
                to={a.to}
              />
            ))}

            {/* Refer button — copy referral */}
            <NeonActionButton
              icon={Users}
              label={t("dashboard.actions.refer")}
              variant="orange"
              onClick={copyReferral}
            />
          </motion.div>

          {/* ── Row 3: Referral code section ──────────────── */}
          <motion.div
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
            variants={prefersReduced ? undefined : itemVariants}
          >
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60">
              {t("heroCard.referralCode")}
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
                className="btn-accent gap-1.5 px-3 py-2 text-xs"
                aria-label={t("heroCard.copyReferralLink")}
              >
                {copied ? (
                  <><Check className="size-3.5 text-success" /> <span className="text-success">{t("heroCard.copied")}</span></>
                ) : (
                  <><Copy className="size-3.5" /> <span>{t("heroCard.copy")}</span></>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}