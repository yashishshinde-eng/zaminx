import { useState } from "react";
import { Copy, Check, ExternalLink, RefreshCw, FlaskConical } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { useSimulatePayment } from "@/hooks/usePackages";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/config";
import type { UserPackageRow } from "@zaminex/shared";

interface PaymentCardProps {
  payment: NonNullable<UserPackageRow["payment"]>;
  packageName: string;
}

/** "Complete your payment" card shown for a pending subscription. */
export function PaymentCard({ payment, packageName }: PaymentCardProps) {
  const simulate = useSimulatePayment();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    if (!payment.payAddress) return;
    try {
      await navigator.clipboard.writeText(payment.payAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <Card className="dash-panel border-warning/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="size-4 text-warning" /> Complete your payment — {packageName}
        </CardTitle>
        <CardDescription>
          Send USDT-BEP20 to the address below to activate your package.
          {payment.sandbox && " (Sandbox mode — use the simulate button to test.)"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">Amount due</p>
          <p className="text-2xl font-bold">
            {payment.payAmount != null ? formatCurrency(payment.payAmount) : "—"}{" "}
            <span className="text-sm font-normal text-muted-foreground">USDT-BEP20</span>
          </p>
        </div>

        {payment.payAddress && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Pay-to address</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-md border bg-muted px-3 py-2 font-mono text-xs">
                {payment.payAddress}
              </code>
              <Button type="button" variant="outline" size="icon" onClick={copyAddress} aria-label="Copy address">
                {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {payment.hostedUrl && (
            <Button asChild size="sm">
              <a href={payment.hostedUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" /> Pay with NOWPayments
              </a>
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.packages.mine })}
          >
            <RefreshCw className="size-4" /> I've paid — refresh
          </Button>
          {payment.sandbox && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={simulate.isPending}
              onClick={() => simulate.mutate(payment.depositId)}
            >
              {simulate.isPending ? "Simulating…" : "Simulate payment (dev)"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}