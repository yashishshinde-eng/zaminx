import { useState } from "react";
import { Link } from "react-router-dom";
import { Lock, ArrowRight, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const DISMISS_KEY = "zeminex.inactiveBannerDismissed";

/**
 * Persistent "activate your package" banner shown inside the app shell for
 * logged-in users whose account is still inactive. New members start inactive
 * and unlock withdrawals / P2P / full features once a package is activated.
 * Dismissible per browser session.
 */
export function InactiveUserBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === "1");

  if (!user || user.status !== "inactive" || dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 border-b bg-warning/10 px-4 py-3 text-sm sm:px-6">
      <Lock className="size-4 shrink-0 text-warning" />
      <p className="flex-1 min-w-0 text-warning">
        <span className="font-medium">Activate a package</span> to unlock withdrawals, transfers, and full account features.
      </p>
      <Link
        to="/app/packages"
        className="inline-flex items-center gap-1.5 rounded-md border border-warning/40 px-3 py-1.5 text-xs font-medium text-warning hover:bg-warning/10"
      >
        Activate <ArrowRight className="size-3.5" />
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="rounded-md p-1 text-warning/70 hover:bg-warning/10"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}