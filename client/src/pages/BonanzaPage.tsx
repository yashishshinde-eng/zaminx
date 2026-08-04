import { motion } from "framer-motion";
import { Gift, Users, CheckCircle2, Lock, Clock, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, EmptyState, ErrorState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useBonanzaOverview } from "@/hooks/useBonanzas";
import { useCountUp } from "@/hooks/useCountUp";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { BonanzaOfferView } from "@zaminex/shared";

/** /app/bonanzas — active bonanza offers with the viewer's progress. */
export function BonanzaPage() {
  const { data, isLoading, isError, refetch } = useBonanzaOverview();

  return (
    <AppShell>
      <PageHeader
        title="Bonanza"
        description="Time-limited reward offers — hit the direct-referral target to earn."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Dashboard", to: "/app" }, { label: "Bonanza" }]}
      />

      <div className="mt-6 space-y-6">
        {/* Direct-count banner */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="glass overflow-hidden">
            <div className="gradient-blue h-1 w-full" />
            <CardContent className="flex items-center gap-3 py-4">
              <div className="gradient-blue flex size-12 items-center justify-center rounded-full text-primary-foreground shadow-sm">
                <Users className="size-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Your direct referrals</p>
                <p className="text-2xl font-bold tabular-nums">
                  <DirectCount value={data?.directCount ?? 0} />
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {isLoading && <OffersSkeleton />}

        {isError && (
          <ErrorState message="We couldn't load your bonanza offers. Please try again." onRetry={() => refetch()} />
        )}

        {data && !isLoading && !isError && (
          <>
            {data.offers.length === 0 ? (
              <EmptyState
                icon={Gift}
                title="No active bonanza offers"
                description="New reward offers will appear here when admins publish them."
              />
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="grid gap-6 md:grid-cols-2"
              >
                {data.offers.map((o) => (
                  <motion.div key={o.id} variants={staggerItem}>
                    <OfferCard offer={o} directCount={data.directCount} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Offer card                                                         */
/* ------------------------------------------------------------------ */

function OfferCard({ offer, directCount }: { offer: BonanzaOfferView; directCount: number }) {
  const progress = Math.min(1, directCount / offer.requiredDirects);
  const pct = Math.round(progress * 100);
  const complete = directCount >= offer.requiredDirects;

  return (
    <Card className={cn("flex h-full flex-col", offer.awarded && "border-success/40")}>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Gift className="size-5" />
            </div>
            <CardTitle className="text-base">{offer.name}</CardTitle>
          </div>
          <AwardBadge offer={offer} />
        </div>
        <CardDescription>
          Refer <span className="font-semibold text-foreground">{offer.requiredDirects}</span> direct members to earn{" "}
          <span className="font-semibold text-foreground">{formatCurrency(offer.rewardAmount)}</span>
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4">
        {/* Reward reveal */}
        <div
          className={cn(
            "flex items-center justify-between rounded-lg border p-3 transition-colors",
            complete ? "border-success/40 bg-success/5" : "border-border/60 bg-muted/30",
          )}
        >
          <div className="flex items-center gap-2">
            <Sparkles className={cn("size-4", complete ? "text-success" : "text-muted-foreground")} />
            <span className="text-xs text-muted-foreground">Reward</span>
          </div>
          <p className={cn("text-lg font-bold tabular-nums", complete && "text-gradient-gold")}>
            {formatCurrency(offer.rewardAmount)}
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="tabular-nums">
              {Math.min(directCount, offer.requiredDirects)} / {offer.requiredDirects}
            </span>
          </div>
          <Progress value={pct} glow={complete} />
        </div>

        {/* Window */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3.5" />
          <span>
            {formatDate(offer.startDate)} – {formatDate(offer.endDate)}
          </span>
        </div>

        {offer.terms && <p className="text-sm text-muted-foreground">{offer.terms}</p>}
      </CardContent>
    </Card>
  );
}

/** Count-up wrapper for the direct-referral banner. */
function DirectCount({ value }: { value: number }) {
  const animated = useCountUp(value, 600);
  return <>{Math.round(animated)}</>;
}

function AwardBadge({ offer }: { offer: BonanzaOfferView }) {
  if (offer.awarded) {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="size-3.5" /> Awarded
      </Badge>
    );
  }
  if (offer.qualified) {
    return (
      <Badge variant="warning" className="gap-1">
        <Clock className="size-3.5" /> Awaiting auto-award
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Lock className="size-3.5" /> Locked
    </Badge>
  );
}

function OffersSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Skeleton className="h-56" />
      <Skeleton className="h-56" />
    </div>
  );
}

export default BonanzaPage;