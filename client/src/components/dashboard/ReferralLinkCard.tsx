import { useState } from "react";
import { motion } from "framer-motion";
import { Link as LinkIcon, Copy, Check, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import type { DashboardSummary } from "@zeminex/shared";

/** Referral code + copyable link. Premium glass panel with gold accent. */
export function ReferralLinkCard({ referral }: { referral: DashboardSummary["referral"] }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(referral.link);
      setCopied(true);
      toast.success(t("referralCard.copiedToast"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("referralCard.copyFailedToast"));
    }
  };

  const share = () => {
    if (navigator.share) {
      navigator.share({ title: t("referralCard.shareTitle"), url: referral.link }).catch(() => undefined);
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
      <div className="flex items-center gap-3 p-4 pb-3 sm:p-5">
        <div className="icon-box-gold shrink-0">
          <LinkIcon className="size-4 text-gold" />
        </div>
        <h3 className="section-title">{t("referralCard.title")}</h3>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-4 pb-4 sm:px-5 sm:pb-5">
        {/* Referral code */}
        <div>
          <p className="metric-label mb-1.5">{t("referralCard.referralCode")}</p>
          <div className="glass-input flex items-center justify-center overflow-hidden p-2.5 sm:p-3">
            <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-lg font-bold tracking-[0.15em] text-gradient-gold sm:text-xl sm:tracking-widest">
              {referral.code}
            </span>
          </div>
        </div>

        {/* Referral link */}
        <div className="flex-1">
          <p className="metric-label mb-1.5">{t("referralCard.referralLink")}</p>
          <div className="glass-input flex items-center gap-2 p-2.5">
            <code className="min-w-0 flex-1 truncate text-xs sm:text-[13px]">{referral.link}</code>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 sm:gap-2.5">
          <button
            onClick={copy}
            className="btn-premium flex-1 gap-1.5 rounded-[14px] px-3 py-2.5 text-xs font-semibold sm:gap-2 sm:px-4 sm:text-sm"
          >
            {copied ? <Check className="size-4 shrink-0" /> : <Copy className="size-4 shrink-0" />}
            <span className="truncate">{copied ? t("referralCard.copied") : t("referralCard.copyLink")}</span>
          </button>
          <button
            onClick={share}
            className="btn-secondary-premium flex-1 gap-1.5 rounded-[14px] px-3 py-2.5 text-xs font-semibold sm:gap-2 sm:px-4 sm:text-sm"
          >
            <Share2 className="size-4 shrink-0" /> <span className="truncate">{t("team.share")}</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}