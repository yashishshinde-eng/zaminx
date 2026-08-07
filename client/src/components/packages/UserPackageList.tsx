import { Package as PackageIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared";
import { formatCurrency, formatDate, durationLabel } from "@/lib/utils";
import { PackageStatusBadge } from "./PackageStatusBadge";
import type { UserPackageRow } from "@zeminex/shared";

interface UserPackageListProps {
  packages: UserPackageRow[] | undefined;
  isLoading: boolean;
}

/** The user's package subscriptions — activation history & status. */
export function UserPackageList({ packages, isLoading }: UserPackageListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <PackageIcon className="size-4 text-primary" /> Your packages
        </CardTitle>
        <CardDescription>Activation history and current status.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : !packages || packages.length === 0 ? (
          <EmptyState
            icon={PackageIcon}
            title="No packages yet"
            description="You haven't activated a package. Browse the tiers above to get started."
          />
        ) : (
          <ul className="divide-y divide-border">
            {packages.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{p.snapshot.name}</p>
                    <PackageStatusBadge status={p.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(p.snapshot.priceUsd)} · {p.snapshot.dailyReturnPct}% daily ·{" "}
                    365-day term
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Started {formatDate(p.createdAt)}
                    {p.status === "active" && p.activatedAt && <> · Activated {formatDate(p.activatedAt)}</>}
                    {p.status === "active" && p.expiresAt && <> · Expires {formatDate(p.expiresAt)}</>}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}