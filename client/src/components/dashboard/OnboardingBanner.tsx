import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MailCheck, Package, Wallet, Users, CheckCircle2, ArrowRight, Sparkles, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/context/AuthContext";
import { useHasOpenPackage } from "@/hooks/usePackages";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { STORAGE_KEYS } from "@/config";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  label: string;
  done: boolean;
  href: string;
  icon: LucideIcon;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * A guided onboarding checklist shown above the dashboard when a user still has
 * incomplete setup steps. Replaces the "wall of zeros" with an actionable path:
 * each step links to its page, the primary CTA highlights the *next* incomplete
 * step, and a progress bar shows how close they are to fully set up.
 *
 * Dismissal is stored as the completed-step count at dismiss time, so the banner
 * re-surfaces if a *new* step later becomes relevant (e.g. they verify email and
 * the next incomplete step changes). Once all 4 steps are done it hides for good.
 */
export function OnboardingBanner() {
  const { user } = useAuth();
  const hasOpenPackage = useHasOpenPackage();
  const { data } = useDashboardSummary();

  const steps: OnboardingStep[] = useMemo(
    () => [
      { label: "Verify your email", done: Boolean(user?.isEmailVerified), href: "/verify-email", icon: MailCheck },
      { label: "Activate your first package", done: hasOpenPackage, href: "/app/packages", icon: Package },
      { label: "Set your USDT-BEP20 address", done: Boolean(user?.walletAddresses?.usdtBep20), href: "/app/settings", icon: Wallet },
      { label: "Refer your first member", done: Boolean((data?.team.directCount ?? 0) > 0), href: "/app/team", icon: Users },
    ],
    [user, hasOpenPackage, data],
  );

  const completed = steps.filter((s) => s.done).length;
  const allDone = completed === steps.length;
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  // Read the persisted "completed count at last dismiss" once on mount.
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.onboardingDismissed);
    setDismissedAt(raw === null ? null : Number(raw));
  }, []);

  // Re-show if a new step becomes relevant after the last dismiss.
  const hidden = dismissedAt !== null && completed <= dismissedAt;
  if (allDone || hidden) return null;

  const nextStep = steps.find((s) => !s.done)!;
  const progress = Math.round((completed / steps.length) * 100);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEYS.onboardingDismissed, String(completed));
    setDismissedAt(completed);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="relative overflow-hidden border-primary/20">
        {/* Decorative gradient wash */}
        <div className="brand-gradient pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-10 blur-2xl" />
        <div className="relative p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="size-4 text-primary" />
                {greeting()}, <span className="font-semibold text-foreground">{user?.name ?? "there"}</span>
                {data?.account.rank?.name ? (
                  <>
                    {" · "}
                    <span className="capitalize text-foreground">{data.account.rank.name}</span> rank
                  </>
                ) : null}
              </p>
              <h2 className="mt-1 text-lg font-semibold sm:text-xl">Let's get you set up</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Complete these {steps.length} steps to unlock the full Zaminex experience.
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Progress */}
          <div className="mt-4 flex items-center gap-3">
            <Progress value={progress} glow className="h-2.5" />
            <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
              {completed}/{steps.length}
            </span>
          </div>

          {/* Steps */}
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <Link
                key={step.label}
                to={step.href}
                className={cn(
                  "group flex items-center gap-2.5 rounded-lg border p-3 transition-colors",
                  step.done
                    ? "border-success/30 bg-success/5"
                    : "border-border bg-card hover:border-primary/40 hover:bg-accent/40",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full",
                    step.done ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
                  )}
                >
                  {step.done ? <CheckCircle2 className="size-4" /> : <step.icon className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium leading-tight">{step.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {step.done ? "Done" : "Pending"}
                  </span>
                </span>
                {!step.done && (
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                )}
              </Link>
            ))}
          </div>

          {/* Primary CTA → next incomplete step */}
          <div className="mt-4 flex items-center gap-3">
            <Button asChild>
              <Link to={nextStep.href}>
                {nextStep.label} <ArrowRight className="size-4" />
              </Link>
            </Button>
            <span className="text-xs text-muted-foreground">
              {steps.length - completed} step{steps.length - completed === 1 ? "" : "s"} to go
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}