import { History, LogIn, UserPlus, MailCheck, KeyRound } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelative } from "@/lib/chart";
import type { DashboardSummary } from "@zaminex/shared";

/** Humanize an ActivityLog action string + pick an icon. */
const ACTION_META: Record<string, { label: string; icon: typeof LogIn }> = {
  "auth.login": { label: "Signed in", icon: LogIn },
  "auth.register": { label: "Account created", icon: UserPlus },
  "auth.verify-email": { label: "Email verified", icon: MailCheck },
  "auth.password-reset": { label: "Password reset", icon: KeyRound },
};

function resolve(action: string) {
  return ACTION_META[action] ?? { label: action, icon: History };
}

/** Real recent activity sourced from the ActivityLog collection. */
export function RecentActivityCard({ activity }: { activity: DashboardSummary["recentActivity"] }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-4 text-primary" /> Recent activity
        </CardTitle>
        <CardDescription>Latest events on your account</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        {activity.length > 0 ? (
          <ul className="divide-y">
            {activity.map((a) => {
              const { label, icon: Icon } = resolve(a.action);
              return (
                <li key={a.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{label}</p>
                    <p className="text-xs text-muted-foreground">{formatRelative(a.createdAt)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex h-[200px] flex-col items-center justify-center text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <History className="size-6" />
            </div>
            <p className="mt-3 text-sm font-medium">No activity yet</p>
            <p className="text-xs text-muted-foreground">Your account actions will show up here.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}