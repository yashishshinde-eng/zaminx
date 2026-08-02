import { Gift, Users, CheckCircle2, Lock, Clock } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, EmptyState, ErrorState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useBonanzaOverview } from "@/hooks/useBonanzas";
import { formatCurrency, formatDate } from "@/lib/utils";
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
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex size-10 items-center justify-center rounded-full bg-fuchsia-500/10 text-fuchsia-600">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Your direct referrals</p>
              <p className="text-2xl font-bold tabular-nums">{data?.directCount ?? 0}</p>
            </div>
          </CardContent>
        </Card>

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
              <div className="grid gap-6 md:grid-cols-2">
                {data.offers.map((o) => (
                  <OfferCard key={o.id} offer={o} directCount={data.directCount} />
                ))}
              </div>
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

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-md bg-fuchsia-500/10 text-fuchsia-600">
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
        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="tabular-nums">
              {Math.min(directCount, offer.requiredDirects)} / {offer.requiredDirects}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-fuchsia-500 transition-all"
              style={{ width: `${pct}%` }}
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
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