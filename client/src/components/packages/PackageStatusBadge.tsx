import { Badge } from "@/components/ui/badge";
import type { UserPackageRow } from "@zeminex/shared";

/** Status badge for a user's package subscription. */
export function PackageStatusBadge({ status }: { status: UserPackageRow["status"] }) {
  switch (status) {
    case "active":
      return <Badge variant="success">Active</Badge>;
    case "pending":
      return <Badge variant="warning">Pending payment</Badge>;
    case "expired":
      return <Badge variant="secondary">Expired</Badge>;
    case "cancelled":
      return <Badge variant="outline">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}