import { Link } from "react-router-dom";
import { Package as PackageIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { DashboardSummary } from "@zeminex/shared";

/** Current package status — activation status, pending count, and history. */
export function PackageCard({ pkg }: { pkg: DashboardSummary["package"] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <PackageIcon className="size-4 text-primary" /> Package
          </CardTitle>
          <CardDescription>Activation status & history</CardDescription>
        </div>
        <Badge variant={pkg.active ? "success" : pkg.pending > 0 ? "warning" : "outline"}>
          {pkg.active ? "Active" : pkg.pending > 0 ? "Pending" : "Inactive"}
        </Badge>
      </CardHeader>
      <CardContent>
        {pkg.active ? (
          <div className="space-y-1.5">
            <p className="font-medium">{pkg.name}</p>
            <p className="text-sm text-muted-foreground">Activated {formatDate(pkg.activatedAt)}</p>
            <p className="text-sm text-muted-foreground">{pkg.historyCount} activation(s) on record</p>
          </div>
        ) : pkg.pending > 0 ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-sm text-muted-foreground">
              {pkg.pending} package{pkg.pending > 1 ? "s" : ""} pending — awaiting payment.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link to="/app/packages">View packages</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-sm text-muted-foreground">You don't have an active package yet.</p>
            <Button asChild size="sm">
              <Link to="/app/packages">Browse packages</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}