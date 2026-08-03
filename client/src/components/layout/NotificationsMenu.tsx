import { Link } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { formatRelative } from "@/lib/chart";

/**
 * Notifications bell shown in the topbar. Reads the dashboard summary's
 * notifications slice. Phase 12 (full notifications) is deferred, so for now
 * this is display-only — a "mark all read" affordance is shown but the API
 * isn't wired yet (it's a no-op until Phase 12).
 */
export function NotificationsMenu() {
  const { data } = useDashboardSummary();
  const unread = data?.notifications.unread ?? 0;
  const items = data?.notifications.items ?? [];

  return (
    <DropdownMenu
      side="bottom"
      align="end"
      trigger={
        <button
          type="button"
          className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
        >
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full brand-gradient px-1 text-[10px] font-bold text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      }
    >
      {() => (
        <div className="min-w-[18rem]">
          <div className="flex items-center justify-between px-2.5 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                disabled
                title="Available in a later release"
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                <CheckCheck className="size-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="h-px w-full bg-border" />
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                <Bell className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">You're all caught up</p>
              <p className="text-xs text-muted-foreground">New notifications will appear here.</p>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto scrollbar-thin">
              {items.slice(0, 12).map((n) => (
                <li key={n.id}>
                  <Link
                    to="/app"
                    className="flex items-start gap-3 px-2.5 py-2.5 transition-colors hover:bg-accent"
                  >
                    <span className="mt-1.5 size-2 shrink-0 rounded-full brand-gradient" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">{n.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{formatRelative(n.createdAt)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="h-px w-full bg-border" />
          <div className="px-2.5 py-2">
            <Badge variant="secondary" className="text-[10px]">
              {unread} unread
            </Badge>
          </div>
        </div>
      )}
    </DropdownMenu>
  );
}