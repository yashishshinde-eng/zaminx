import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRightToLine,
  UserPlus,
  MailCheck,
  KeyRound,
  History,
  Clock,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { formatRelative } from "@/lib/chart";
import type { DashboardSummary } from "@zeminex/shared";

/* ── Action-type metadata ─────────────────────────────────────── */
const ACTION_META: Record<string, { label: string; icon: typeof ArrowRightToLine; badge: "success" | "info" }> = {
  "auth.login": { label: "Signed in", icon: ArrowRightToLine, badge: "success" },
  "auth.register": { label: "Account created", icon: UserPlus, badge: "success" },
  "auth.verify-email": { label: "Email verified", icon: MailCheck, badge: "success" },
  "auth.password-reset": { label: "Password reset", icon: KeyRound, badge: "success" },
};

function resolve(action: string) {
  return (
    ACTION_META[action] ?? {
      label: action,
      icon: History,
      badge: "info" as const,
    }
  );
}

/* ── Entrance animation variants ──────────────────────────────── */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

/* ── Props ────────────────────────────────────────────────────── */
export interface RecentTransactionsProps {
  activity: DashboardSummary["recentActivity"];
}

/**
 * Premium recent transactions table — replaces RecentActivityCard
 * with a glass-panel, icon-mapped rows, status badges, and staggered entrance.
 */
export function RecentTransactions({ activity }: RecentTransactionsProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      className="glass-card relative overflow-hidden p-5 sm:p-6"
      initial="hidden"
      animate="visible"
      variants={prefersReduced ? undefined : containerVariants}
    >
      {/* ── Inner highlight ─────────────────────────────────── */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      {/* ── Title row ────────────────────────────────────────── */}
      <motion.div
        className="flex items-center justify-between mb-5"
        variants={prefersReduced ? undefined : itemVariants}
      >
        <div className="flex items-center gap-3">
          <div className="icon-box-blue">
            <Clock className="size-4 text-blue" />
          </div>
          <h2 className="section-title">Recent Transactions</h2>
        </div>

        {/* Decorative icon buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] text-muted-foreground transition-all duration-200 hover:bg-white/[0.06] hover:text-foreground"
            aria-label="Search transactions"
          >
            <Search className="size-3.5" />
          </button>
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] text-muted-foreground transition-all duration-200 hover:bg-white/[0.06] hover:text-foreground"
            aria-label="Filter transactions"
          >
            <SlidersHorizontal className="size-3.5" />
          </button>
        </div>
      </motion.div>

      {/* ── Content ──────────────────────────────────────────── */}
      {activity.length > 0 ? (
        <div className="flex flex-col gap-1">
          {activity.map((a, i) => {
            const { label, icon: Icon, badge } = resolve(a.action);
            const isCompleted = badge === "success";

            return (
              <motion.div
                key={a.id}
                className="premium-transaction-row glass-card-hover"
                variants={prefersReduced ? undefined : itemVariants}
                custom={i}
              >
                {/* Icon */}
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                    isCompleted
                      ? "bg-success/10 text-success"
                      : "bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <Icon className="size-4" />
                </span>

                {/* Description + time */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">{label}</p>
                  <p className="text-xs text-muted-foreground">{formatRelative(a.createdAt)}</p>
                </div>

                {/* Status badge */}
                <span
                  className={`chip ${
                    isCompleted ? "chip-success" : "bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {isCompleted ? "Completed" : "Info"}
                </span>
              </motion.div>
            );
          })}

          {/* View all link */}
          <motion.div
            className="flex justify-center pt-3"
            variants={prefersReduced ? undefined : itemVariants}
          >
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue transition-colors duration-200 hover:text-blue-light"
            >
              View all activity
            </button>
          </motion.div>
        </div>
      ) : (
        /* ── Empty state ──────────────────────────────────────── */
        <motion.div
          className="flex flex-col items-center justify-center gap-3 py-10"
          variants={prefersReduced ? undefined : itemVariants}
        >
          <div className="flex size-14 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl">
            <Clock className="size-6 text-muted-foreground/50" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">No recent activity</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Your transactions and events will appear here.
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}