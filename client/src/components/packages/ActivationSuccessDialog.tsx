import { CheckCircle2, Sparkles } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ActivatePackageResponse } from "@zeminex/shared";

interface ActivationSuccessDialogProps {
  open: boolean;
  onClose: () => void;
  /** The activation response (active subscription + paid deposit). */
  result: ActivatePackageResponse | null;
  /** When set, the activation was for another member (their name). Omitted = self. */
  beneficiaryName?: string;
}

/** "Activation Successful" popup shown after a package is activated — for self
 *  or for another member. Surfaces the package snapshot, the debited amount,
 *  the term/expiry, and (for "for member") the beneficiary. */
export function ActivationSuccessDialog({ open, onClose, result, beneficiaryName }: ActivationSuccessDialogProps) {
  if (!result) return null;
  const { package: pkg, payment } = result;
  const snap = pkg.snapshot;
  const forOther = !!beneficiaryName;
  const termLabel = snap.durationDays > 0 ? `${snap.durationDays} days` : "Lifetime";
  const debitedFrom = "Your Main wallet";

  return (
    <Dialog open={open} onClose={onClose} labelledBy="activation-success-title" className="max-w-md">
      <div className="flex flex-col items-center text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-success/15">
          <CheckCircle2 className="size-8 text-success" />
        </div>
        <h2 id="activation-success-title" className="mt-4 text-xl font-semibold">
          Activation Successful
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {forOther ? (
            <>
              Package activated for <span className="font-medium text-foreground">{beneficiaryName}</span>.
            </>
          ) : (
            "Your package is now active."
          )}
        </p>
      </div>

      {/* Package card */}
      <div className="glass-card mt-6 space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-blue-light" />
            <span className="font-grotesk text-base font-bold">{snap.name}</span>
          </div>
          <Badge variant="success" className="capitalize">active</Badge>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Detail label="Price" value={formatCurrency(snap.priceUsd)} />
          <Detail label="Daily return" value={`${snap.dailyReturnPct}%`} />
          <Detail label="Term" value={termLabel} />
          <Detail label="Debited from" value={debitedFrom} />
          <Detail label="Activated on" value={formatDate(pkg.activatedAt)} />
          <Detail label="Expires" value={pkg.expiresAt ? formatDate(pkg.expiresAt) : "Never"} />
        </dl>
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        {formatCurrency(payment.amountUsd)} was debited and the subscription is{" "}
        <span className="font-medium text-success">paid</span>.
      </p>

      <div className="mt-6 flex justify-center">
        <Button onClick={onClose}>Done</Button>
      </div>
    </Dialog>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}

export default ActivationSuccessDialog;