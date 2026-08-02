import { BadgeCheck, ShieldCheck, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import type { DashboardSummary } from "@zaminex/shared";

/** Account summary tile — name, verification + role badges, member-since. */
export function AccountSummaryCard({ account }: { account: DashboardSummary["account"] }) {
  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold tracking-tight">{account.name}</h2>
            <p className="truncate text-sm text-muted-foreground">{account.email}</p>
          </div>
          {account.isEmailVerified ? (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
              <BadgeCheck className="size-4" /> Verified
            </span>
          ) : (
            <Badge variant="warning">Unverified</Badge>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" /> Role
            </div>
            <p className="mt-1 text-sm font-semibold capitalize">{account.role}</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" /> Member since
            </div>
            <p className="mt-1 text-sm font-semibold">{formatDate(account.memberSince).split(",")[0]}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}