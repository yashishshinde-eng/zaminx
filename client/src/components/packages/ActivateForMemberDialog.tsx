import { useEffect, useMemo, useState } from "react";
import { UserPlus, Search, Wallet as WalletIcon, Check } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ActivationSuccessDialog } from "@/components/packages/ActivationSuccessDialog";
import {
  usePackageCatalog,
  useLookupPackageTarget,
  useActivatePackageFor,
} from "@/hooks/usePackages";
import { useWallet } from "@/hooks/useWallet";
import { formatCurrency } from "@/lib/utils";
import type { ActivatePackageResponse } from "@zeminex/shared";

interface ActivateForMemberDialogProps {
  open: boolean;
  onClose: () => void;
  /** Prefilled beneficiary (from a team row). When omitted, the dialog enters
   *  manual mode and resolves a target from a referral code. */
  target?: { id: string; name: string };
}

/** Activate a package for another inactive user, paid from the active user's
 *  own Main wallet. Two modes: prefilled (a team row) or manual (enter a code). */
export function ActivateForMemberDialog({ open, onClose, target }: ActivateForMemberDialogProps) {
  const prefilled = !!target;
  const catalog = usePackageCatalog();
  const wallet = useWallet();
  const activateFor = useActivatePackageFor();

  const mainAvailable = wallet.data?.main.available ?? 0;

  // Manual-mode target resolution. We fetch only after "Verify" is clicked by
  // gating the query on `lookupCode` (separate from the input value).
  const [codeInput, setCodeInput] = useState("");
  const [lookupCode, setLookupCode] = useState<string | undefined>(undefined);
  const lookup = useLookupPackageTarget(prefilled ? undefined : lookupCode);

  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [success, setSuccess] = useState<ActivatePackageResponse | null>(null);
  const [beneficiaryName, setBeneficiaryName] = useState<string>("");

  // Reset transient state whenever the dialog opens / target changes.
  useEffect(() => {
    if (!open) return;
    setCodeInput("");
    setLookupCode(undefined);
    setSelectedPackageId(null);
    setSuccess(null);
    setBeneficiaryName("");
  }, [open, target?.id]);

  // Resolve the effective target. In prefilled mode the team row is the source
  // of truth (the row is only shown for inactive members). In manual mode use
  // the lookup result.
  const resolvedTarget = useMemo(() => {
    if (prefilled && target) {
      return { id: target.id, name: target.name, status: "inactive" as const, isSelf: false };
    }
    if (lookup.data) {
      return { id: lookup.data.id, name: lookup.data.name, status: lookup.data.status, isSelf: lookup.data.isSelf };
    }
    return null;
  }, [prefilled, target, lookup.data]);

  const eligible =
    !!resolvedTarget &&
    resolvedTarget.status === "inactive" &&
    !resolvedTarget.isSelf;

  const selectedTier = catalog.data?.find((t) => t.id === selectedPackageId) ?? null;
  const canAfford = !!selectedTier && mainAvailable >= selectedTier.priceUsd;

  const confirmDisabled =
    !eligible || !selectedTier || !canAfford || activateFor.isPending;

  function handleVerify() {
    const c = codeInput.trim();
    if (!c) return;
    setLookupCode(c);
  }

  function handleConfirm() {
    if (confirmDisabled || !resolvedTarget || !selectedTier) return;
    setBeneficiaryName(resolvedTarget.name);
    activateFor.mutate(
      { packageId: selectedTier.id, targetUserId: resolvedTarget.id },
      { onSuccess: (res) => setSuccess(res) },
    );
  }

  // After a successful activation, replace the form with the success popup.
  // Closing the success popup closes the whole dialog.
  if (success) {
    return (
      <ActivationSuccessDialog
        open={open}
        result={success}
        beneficiaryName={beneficiaryName}
        onClose={() => {
          setSuccess(null);
          onClose();
        }}
      />
    );
  }

  return (
    <Dialog open={open} onClose={onClose} labelledBy="activate-for-title" className="max-w-xl">
      <div className="flex items-center gap-3 pr-8">
        <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue/20 to-blue-dark/10">
          <UserPlus className="size-4 text-blue-light" />
        </div>
        <div>
          <h2 id="activate-for-title" className="text-lg font-semibold">
            Activate a package for a member
          </h2>
          <p className="text-sm text-muted-foreground">
            Paid from your Main wallet — the member becomes active.
          </p>
        </div>
      </div>

      {/* Beneficiary */}
      <div className="mt-6 space-y-3">
        {prefilled && target ? (
          <div className="glass-card flex items-center justify-between p-3">
            <div>
              <p className="text-xs text-muted-foreground">Beneficiary</p>
              <p className="font-medium">{target.name}</p>
            </div>
            <Badge variant="warning" className="capitalize">inactive</Badge>
          </div>
        ) : (
          <>
            <Label htmlFor="target-code">Member referral code</Label>
            <div className="flex gap-2">
              <Input
                id="target-code"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                placeholder="Enter the member's referral code"
                disabled={activateFor.isPending}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleVerify}
                disabled={!codeInput.trim() || lookup.isFetching}
              >
                <Search className="size-4" /> Verify
              </Button>
            </div>

            {lookup.isFetching && <Skeleton className="h-12 w-full" />}

            {lookup.isError && !lookup.isFetching && (
              <p className="text-sm text-destructive">
                No user found for that code. Check the code and try again.
              </p>
            )}

            {resolvedTarget && !lookup.isFetching && (
              <div className="glass-card flex items-center justify-between p-3">
                <div>
                  <p className="text-xs text-muted-foreground">Beneficiary</p>
                  <p className="font-medium">{resolvedTarget.name}</p>
                </div>
                <Badge
                  variant={resolvedTarget.status === "inactive" ? "warning" : resolvedTarget.status === "active" ? "success" : "destructive"}
                  className="capitalize"
                >
                  {resolvedTarget.status}
                </Badge>
              </div>
            )}

            {resolvedTarget?.isSelf && (
              <p className="text-sm text-destructive">
                That's your own code — use the standard activation for your package.
              </p>
            )}
            {resolvedTarget && resolvedTarget.status !== "inactive" && !resolvedTarget.isSelf && (
              <p className="text-sm text-destructive">
                That member is not inactive — only inactive users can be activated for.
              </p>
            )}
          </>
        )}
      </div>

      {/* Actor's Main wallet balance */}
      <div className="mt-5 glass-card flex items-center gap-3 p-3">
        <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue/20 to-blue-dark/10">
          <WalletIcon className="size-4 text-blue-light" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Your Main wallet balance</p>
          <p className="font-grotesk text-base font-bold tabular-nums">
            {wallet.isLoading ? "—" : formatCurrency(mainAvailable)}
          </p>
        </div>
      </div>

      {/* Package picker */}
      <div className="mt-5">
        <p className="text-sm font-medium">Choose a package</p>
        {catalog.isLoading && (
          <div className="mt-2 space-y-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        )}
        {catalog.isError && (
          <p className="mt-2 text-sm text-destructive">Couldn't load the package catalog.</p>
        )}
        {catalog.data && catalog.data.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">No packages available.</p>
        )}
        <div className="mt-2 grid gap-2">
          {catalog.data?.map((tier) => {
            const selected = tier.id === selectedPackageId;
            const afford = mainAvailable >= tier.priceUsd;
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => setSelectedPackageId(tier.id)}
                disabled={activateFor.isPending}
                className={[
                  "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                  selected ? "border-blue bg-blue/10" : "border-border hover:bg-muted/40",
                  !afford ? "opacity-50" : "",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex size-5 shrink-0 items-center justify-center rounded-full border",
                    selected ? "border-blue bg-blue text-primary-foreground" : "border-muted-foreground/40",
                  ].join(" ")}
                >
                  {selected && <Check className="size-3" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{tier.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {tier.dailyReturnPct}% daily
                    {tier.durationDays > 0 ? ` · ${tier.durationDays}d` : " · lifetime"}
                  </p>
                </div>
                <span className="shrink-0 font-grotesk font-bold tabular-nums">
                  {formatCurrency(tier.priceUsd)}
                </span>
              </button>
            );
          })}
        </div>
        {selectedTier && !canAfford && (
          <p className="mt-2 text-sm text-destructive">
            Insufficient balance — {formatCurrency(selectedTier.priceUsd)} needed. Deposit first.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={activateFor.isPending}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={confirmDisabled}>
          {activateFor.isPending ? "Activating…" : "Activate package"}
        </Button>
      </div>
    </Dialog>
  );
}

export default ActivateForMemberDialog;