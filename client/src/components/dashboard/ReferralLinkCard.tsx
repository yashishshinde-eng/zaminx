import { useState } from "react";
import { motion } from "framer-motion";
import { Link as LinkIcon, Copy, Check, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import type { DashboardSummary } from "@zeminex/shared";

/** Referral code + copyable link. Premium glass panel with gold accent. */
export function ReferralLinkCard({ referral }: { referral: DashboardSummary["referral"] }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(referral.link);
      setCopied(true);
      toast.success("Referral link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — long-press to select manually.");
    }
  };

  const share = () => {
    if (navigator.share) {
      navigator.share({ title: "Join me on Zeminex Global", url: referral.link }).catch(() => undefined);
    } else {
      copy();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card glass-card-hover relative flex h-full flex-col overflow-hidden"
    >
      {/* Gradient accent at top */}
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{
          background: "linear-gradient(90deg, hsl(var(--gold)), hsl(var(--blue)), hsl(var(--gold)))",
        }}
      />

      {/* Title */}
      <div className="flex items-center gap-3 p-5 pb-3">
        <div className="icon-box-gold">
          <LinkIcon className="size-4 text-gold" />
        </div>
        <h3 className="section-title">Referral Link</h3>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-5 pb-5">
        {/* Referral code */}
        <div>
          <p className="metric-label mb-1.5">Referral code</p>
          <div className="glass-input flex items-center justify-center p-3">
            <span className="font-mono text-xl font-bold tracking-widest text-gradient-gold">
              {referral.code}
            </span>
          </div>
        </div>

        {/* Referral link */}
        <div className="flex-1">
          <p className="metric-label mb-1.5">Referral link</p>
          <div className="glass-input flex items-center gap-2 p-2.5">
            <code className="min-w-0 flex-1 truncate text-xs">{referral.link}</code>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2.5">
          <button
            onClick={copy}
            className="btn-premium flex-1 gap-2 rounded-[14px] px-4 py-2.5 text-sm font-semibold"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy link"}
          </button>
          <button
            onClick={share}
            className="btn-secondary-premium flex-1 gap-2 rounded-[14px] px-4 py-2.5 text-sm font-semibold"
          >
            <Share2 className="size-4" /> Share
          </button>
        </div>
      </div>
    </motion.div>
  );
}