import { useState } from "react";
import { Link as LinkIcon, Copy, Check, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardSummary } from "@zaminex/shared";

/** Referral code + copyable link. Fully functional today (real referral code). */
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

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <LinkIcon className="size-4 text-primary" /> Your referral link
        </CardTitle>
        <CardDescription>Share it to build your team and earn bonuses</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Referral code</p>
          <p className="mt-0.5 font-mono text-lg font-semibold tracking-wide text-gradient-gold">{referral.code}</p>
        </div>
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground">Referral link</p>
          <div
            className={cn(
              "glass-input mt-1 flex items-center gap-2 p-2.5",
            )}
          >
            <code className="min-w-0 flex-1 truncate text-xs">{referral.link}</code>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={copy} className="flex-1" size="sm">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: "Join me on Zaminex", url: referral.link }).catch(() => undefined);
              } else {
                copy();
              }
            }}
          >
            <Share2 className="size-4" /> Share
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}