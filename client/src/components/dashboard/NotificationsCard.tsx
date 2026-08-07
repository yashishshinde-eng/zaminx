import { motion } from "framer-motion";
import { Bell } from "lucide-react";
import { formatRelative } from "@/lib/chart";
import type { DashboardSummary } from "@zeminex/shared";

/** Notifications list with premium glass pills. */
export function NotificationsCard({ notifications }: { notifications: DashboardSummary["notifications"] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card glass-card-hover relative flex flex-col overflow-hidden"
    >
      {/* Title */}
      <div className="flex items-center justify-between p-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="icon-box-blue">
            <Bell className="size-4 text-gold" />
          </div>
          <h3 className="section-title">Notifications</h3>
        </div>
        {notifications.unread > 0 && (
          <span className="badge-pulse chip chip-blue">{notifications.unread} new</span>
        )}
      </div>

      <div className="flex-1 px-5 pb-5">
        {notifications.items.length > 0 ? (
          <ul className="space-y-2">
            {notifications.items.map((n, i) => (
              <motion.li
                key={n.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="group flex items-start gap-3 rounded-[14px] border border-white/[0.04] bg-white/[0.01] p-3 transition-all duration-200 hover:border-white/[0.08] hover:bg-white/[0.03]"
              >
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue/[0.08] text-blue">
                  <Bell className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-snug">{n.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatRelative(n.createdAt)}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        ) : (
          <div className="flex h-[200px] flex-col items-center justify-center text-center">
            <div
              className="flex size-14 items-center justify-center rounded-2xl"
              style={{
                background: "linear-gradient(135deg, hsl(var(--blue) / 0.15), hsl(var(--blue-dark) / 0.1))",
                boxShadow: "0 0 24px -4px hsl(var(--blue) / 0.15)",
              }}
            >
              <Bell className="size-6 text-blue" />
            </div>
            <p className="mt-3 text-sm font-semibold">No notifications yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Account alerts will appear here.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}