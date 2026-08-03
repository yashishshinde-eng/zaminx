import { Bell } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/chart";
import type { DashboardSummary } from "@zaminex/shared";

/** Notifications list — empty state until Phase 12. */
export function NotificationsCard({ notifications }: { notifications: DashboardSummary["notifications"] }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="size-4 text-primary" /> Notifications
          </CardTitle>
          <CardDescription>Recent account alerts</CardDescription>
        </div>
        {notifications.unread > 0 && <Badge variant="secondary">{notifications.unread} new</Badge>}
      </CardHeader>
      <CardContent className="flex-1">
        {notifications.items.length > 0 ? (
          <ul className="divide-y divide-white/[0.06]">
            {notifications.items.map((n) => (
              <li key={n.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary shadow-glow-gold" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{formatRelative(n.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex h-[200px] flex-col items-center justify-center text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bell className="size-6" />
            </div>
            <p className="mt-3 text-sm font-medium">No notifications yet</p>
            <p className="text-xs text-muted-foreground">Account alerts will appear here.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}