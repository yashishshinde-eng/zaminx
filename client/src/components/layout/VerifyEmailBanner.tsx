import { useState } from "react";
import { Link } from "react-router-dom";
import { MailWarning, Send, X } from "lucide-react";
import toast from "react-hot-toast";
import { resendVerificationRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";

const DISMISS_KEY = "zaminex.verifyBannerDismissed";

/**
 * Persistent "verify your email" banner shown inside the app shell for logged-in
 * users whose email is not yet verified. Dismissible per browser session.
 */
export function VerifyEmailBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === "1");
  const [sending, setSending] = useState(false);

  if (!user || user.isEmailVerified || dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const resend = async () => {
    setSending(true);
    try {
      await resendVerificationRequest(user.email);
      toast.success("Verification email sent. Check your inbox.");
    } catch {
      // Interceptor toasts on network error.
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 border-b bg-warning/10 px-4 py-3 text-sm sm:px-6">
      <MailWarning className="size-4 shrink-0 text-warning" />
      <p className="flex-1 min-w-0 text-warning">
        <span className="font-medium">Verify your email</span> to unlock deposits, withdrawals, and full account features.{" "}
        <Link to="/verify-email" className="underline hover:opacity-80">Learn more</Link>
      </p>
      <button
        type="button"
        onClick={resend}
        disabled={sending}
        className="inline-flex items-center gap-1.5 rounded-md border border-warning/40 px-3 py-1.5 text-xs font-medium text-warning hover:bg-warning/10 disabled:opacity-60"
      >
        <Send className="size-3.5" /> {sending ? "Sending…" : "Resend email"}
      </button>
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