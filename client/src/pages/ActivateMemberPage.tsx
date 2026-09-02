import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  UserPlus,
  Search,
  Wallet as WalletIcon,
  Check,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared";
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

/**
 * /app/activate-member — dedicated full-page version of the former
 * "Activate a package for a member" dialog. An active user pays from their own
 * Main wallet to activate a package for another inactive user.
 *
 * The target member is resolved from a referral code. A prefilled code can be
 * supplied via the URL (`/app/activate-member?code=ZAM-X9K2`) — this is how the
 * Team page's per-row "Activate" action deep-links into this page.
 */
export function ActivateMemberPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const prefilledCode = searchParams.get("code") ?? "";

  const catalog = usePackageCatalog();
  const wallet = useWallet();
  const activateFor = useActivatePackageFor();

  const mainAvailable = wallet.data?.main.available ?? 0;

  // Target resolution — we fetch only after "Verify" is clicked (or on mount via
  // a prefilled ?code=), gating the query on `lookupCode` (separate from input).
  const [codeInput, setCodeInput] = useState("");
  const [lookupCode, setLookupCode] = useState<string | undefined>(undefined);
  const lookup = useLookupPackageTarget(lookupCode);

  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [success, setSuccess] = useState<ActivatePackageResponse | null>(null);
  const [beneficiaryName, setBeneficiaryName] = useState<string>("");

  // Prefill + auto-verify when landed from a deep link (?code=...).
  useEffect(() => {
    if (!prefilledCode) return;
    setCodeInput(prefilledCode);
    setLookupCode(prefilledCode);
  }, [prefilledCode]);

  const resolvedTarget = useMemo(() => {
    if (lookup.data) {
      return { id: lookup.data.id, name: lookup.data.name, status: lookup.data.status, isSelf: lookup.data.isSelf };
    }
    return null;
  }, [lookup.data]);

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

  // After a successful activation, the success popup overlays the page. "Done"
  // returns to the Team page (where the member's status will have flipped).
  if (success) {
    return (
      <AppShell>
        <PageHeader
          title="Activate for member"
          description="Activate a package for another inactive member, paid from your Main wallet."
          breadcrumbs={[{ label: "Home", to: "/" }, { label: "Dashboard", to: "/app" }, { label: "Team", to: "/app/team" }, { label: "Activate for member" }]}
        />
        <div className="mt-6 max-w-2xl">
          <ActivationSuccessDialog
            open
            result={success}
            beneficiaryName={beneficiaryName}
            onClose={() => {
              setSuccess(null);
              navigate("/app/team");
            }}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Activate for member"
        description="Activate a package for another inactive member, paid from your Main wallet."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Dashboard", to: "/app" }, { label: "Team", to: "/app/team" }, { label: "Activate for member" }]}
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* ── Left: beneficiary + package picker ─────────────────────── */}
        <div className="space-y-5">
          {/* Beneficiary card */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="glass-card p-5"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple/20 to-purple-dark/10">
                <UserPlus className="size-4 text-purple-light" />
              </div>
              <div>
                <h2 className="font-grotesk text-base font-semibold">Member to activate</h2>
                <p className="text-sm text-muted-foreground">
                  Enter the member&apos;s referral code, then verify.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
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

              {lookup.isFetching && <Skeleton className="h-14 w-full" />}

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
                  That&apos;s your own code — use the standard activation for your package on the{" "}
                  <Link to="/app/packages" className="underline">Packages</Link> page.
                </p>
              )}
              {resolvedTarget && resolvedTarget.status !== "inactive" && !resolvedTarget.isSelf && (
                <p className="text-sm text-destructive">
                  That member is not inactive — only inactive users can be activated for.
                </p>
              )}
            </div>
          </motion.section>

          {/* Package picker */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="glass-card p-5"
          >
            <p className="font-grotesk text-base font-semibold">Choose a package</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The package is charged to your Main wallet and credited to the member.
            </p>

            {catalog.isLoading && (
              <div className="mt-3 space-y-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            )}
            {catalog.isError && (
              <p className="mt-3 text-sm text-destructive">Couldn&apos;t load the package catalog.</p>
            )}
            {catalog.data && catalog.data.length === 0 && (
              <p className="mt-3 text-sm text-muted-foreground">No packages available.</p>
            )}

            <div className="mt-3 grid gap-2">
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
          </motion.section>
        </div>

        {/* ── Right: sticky summary + confirm ───────────────────────── */}
        <motion.aside
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="lg:sticky lg:top-6 lg:self-start"
        >
          <div className="glass-card space-y-4 p-5">
            {/* Wallet balance */}
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue/20 to-blue-dark/10">
                <WalletIcon className="size-4 text-blue-light" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Your Main wallet balance</p>
                <p className="font-grotesk text-lg font-bold tabular-nums">
                  {wallet.isLoading ? "—" : formatCurrency(mainAvailable)}
                </p>
              </div>
            </div>

            <div className="h-px bg-white/[0.06]" />

            {/* Selected package summary */}
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Selected package</p>
              {selectedTier ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{selectedTier.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedTier.dailyReturnPct}% daily
                      {selectedTier.durationDays > 0 ? ` · ${selectedTier.durationDays}d` : " · lifetime"}
                    </p>
                  </div>
                  <span className="font-grotesk font-bold tabular-nums">{formatCurrency(selectedTier.priceUsd)}</span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No package selected yet.</p>
              )}
            </div>

            {/* Beneficiary summary */}
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Beneficiary</p>
              {resolvedTarget ? (
                <div className="flex items-center justify-between">
                  <p className="font-medium">{resolvedTarget.name}</p>
                  <Badge
                    variant={resolvedTarget.status === "inactive" ? "warning" : resolvedTarget.status === "active" ? "success" : "destructive"}
                    className="capitalize"
                  >
                    {resolvedTarget.status}
                  </Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Verify a referral code first.</p>
              )}
            </div>

            {/* Insufficient balance hint */}
            {selectedTier && !canAfford && (
              <p className="text-sm text-destructive">
                Insufficient balance — {formatCurrency(selectedTier.priceUsd)} needed.{" "}
                <Link to="/app/deposit" className="underline">Deposit funds</Link>.
              </p>
            )}

            {/* Eligibility hint */}
            {!eligible && resolvedTarget && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <ShieldCheck className="size-3.5" /> This member isn&apos;t eligible for activation.
              </p>
            )}

            <Button
              type="button"
              className="btn-premium w-full h-11"
              onClick={handleConfirm}
              disabled={confirmDisabled}
            >
              {activateFor.isPending ? "Activating…" : (<>Activate package <ArrowRight className="size-4" /></>)}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Funds are debited from your Main wallet instantly.
            </p>
          </div>
        </motion.aside>
      </div>
    </AppShell>
  );
}

export default ActivateMemberPage;