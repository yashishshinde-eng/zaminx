import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { MailCheck, Package, Wallet, Users, CheckCircle2, ArrowRight, Sparkles, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/context/AuthContext";
import { useHasOpenPackage } from "@/hooks/usePackages";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { STORAGE_KEYS } from "@/config";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  id: string;
  label: string;
  done: boolean;
  href: string;
  icon: LucideIcon;
}

function greeting(t: TFunction): string {
  const h = new Date().getHours();
  if (h < 12) return t("dashboard.greetingMorning");
  if (h < 18) return t("dashboard.greetingAfternoon");
  return t("dashboard.greetingEvening");
}

/**
 * A guided onboarding checklist shown above the dashboard when a user still has
 * incomplete setup steps. Premium glassmorphism with animated gradient border.
 */
export function OnboardingBanner() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const hasOpenPackage = useHasOpenPackage();
  const { data } = useDashboardSummary();

  const steps: OnboardingStep[] = useMemo(
    () => [
      { id: "verifyEmail", label: t("onboarding.stepVerifyEmail"), done: Boolean(user?.isEmailVerified), href: "/verify-email", icon: MailCheck },
      { id: "activatePackage", label: t("onboarding.stepActivatePackage"), done: hasOpenPackage, href: "/app/packages", icon: Package },
      { id: "setAddress", label: t("onboarding.stepSetAddress"), done: Boolean(user?.walletAddresses?.usdtBep20), href: "/app/settings", icon: Wallet },
      { id: "referMember", label: t("onboarding.stepReferMember"), done: Boolean((data?.team.directCount ?? 0) > 0), href: "/app/team", icon: Users },
    ],
    [t, user, hasOpenPackage, data],
  );

  const completed = steps.filter((s) => s.done).length;
  const allDone = completed === steps.length;
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEYS.onboardingDismissed);
    setDismissedAt(raw === null ? null : Number(raw));
  }, []);

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
      <div className="gradient-border-animated">
        <div className="glass-card relative overflow-hidden">
          {/* Animated gradient top border */}
          <div
            className="absolute inset-x-0 top-0 h-[2px]"
            style={{
              background: "linear-gradient(90deg, hsl(var(--blue)), hsl(var(--gold)), hsl(var(--purple)), hsl(var(--blue)))",
              backgroundSize: "200% 100%",
              animation: "gradient-shift 3s ease-in-out infinite",
            }}
          />

          {/* Decorative gradient wash */}
          <div className="gradient-blue pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-10 blur-2xl" />

          <div className="relative p-5 sm:p-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="size-4 text-gold" />
                  {greeting(t)}, <span className="welcome-greeting font-semibold">{user?.name ?? t("dashboard.there")}</span>
                  {data?.account.rank?.name ? (
                    <>
                      {" "}&middot;{" "}
                      <span className="chip chip-gold capitalize">{data.account.rank.name}</span>
                    </>
                  ) : null}
                </p>
                <h2 className="font-grotesk mt-1 text-lg font-semibold sm:text-xl">{t("onboarding.title")}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {t("onboarding.subtitle", { count: steps.length })}
                </p>
              </div>
              <button
                type="button"
                onClick={dismiss}
                aria-label={t("onboarding.dismiss")}
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
              {steps.map((step, i) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.1 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    to={step.href}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-[14px] border p-3 transition-all duration-300",
                      step.done
                        ? "border-success/20 bg-success/5"
                        : "border-white/[0.06] bg-white/[0.02] backdrop-blur-xl hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-white/[0.04]",
                      !step.done && "hover:shadow-[0_0_24px_-8px_hsl(var(--blue)/0.15)]",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
                        step.done
                          ? "bg-success/15 text-success"
                          : "bg-white/[0.04] text-muted-foreground group-hover:bg-blue/10 group-hover:text-gold",
                      )}
                    >
                      {step.done ? <CheckCircle2 className="size-4" /> : <step.icon className="size-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-tight">{step.label}</span>
                      <span className={cn("text-xs", step.done ? "text-success" : "text-muted-foreground")}>
                        {step.done ? t("onboarding.done") : t("onboarding.pending")}
                      </span>
                    </span>
                    {!step.done && (
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    )}
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Primary CTA */}
            <div className="mt-4 flex items-center gap-3">
              <Link to={nextStep.href} className="btn-premium inline-flex items-center gap-2 rounded-[14px] px-5 py-2.5 text-sm font-semibold">
                {nextStep.label} <ArrowRight className="size-4" />
              </Link>
              <span className="text-xs text-muted-foreground">
                {t("onboarding.stepsToGo", { count: steps.length - completed })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}