import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { SlidersHorizontal, Users, Zap } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, Pagination } from "@/components/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompensationSettings, useUpdateCompensationSettings } from "@/hooks/useAdmin";
import {
  runYieldTrigger,
  runTeamEnergyTrigger,
  runCommunityTrigger,
  evaluateBonanzasTrigger,
  runRankCheckTrigger,
  fetchCommunityReport,
  type TriggerResult,
} from "@/lib/admin";
import type { CompensationSettings, CompensationSettingsBody, AdminCommunityBonusReport } from "@zeminex/shared";

/** /app/admin/compensation — edit the 7 compensation knobs + run engine triggers. */
export function AdminCompensationSettingsPage() {
  const { data, isLoading } = useCompensationSettings();
  const updateMut = useUpdateCompensationSettings();

  // Local form state — mirrors SettingsPage's manual-state pattern. Booleans
  // + the array field are awkward in react-hook-form, so the whole form is
  // local state synced from the query (like the Notifications form there).
  const [form, setForm] = useState<CompensationSettings | null>(null);
  const [teamEnergyPctText, setTeamEnergyPctText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setForm(data);
      setTeamEnergyPctText(data.teamEnergyPct.join(", "));
    }
  }, [data]);

  const isDirty = Boolean(form && data && !sameSettings(form, data, teamEnergyPctText, data.teamEnergyPct));

  function patch<K extends keyof CompensationSettings>(key: K, value: CompensationSettings[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function onSave() {
    if (!form) return;
    const pct = parsePctArray(teamEnergyPctText);
    if (pct === null) {
      toast.error("Team energy percentages must be comma-separated numbers 0–100.");
      return;
    }
    const body: CompensationSettingsBody = {
      directBonusPct: form.directBonusPct,
      yieldEnabled: form.yieldEnabled,
      monthlyYieldCapPct: form.monthlyYieldCapPct,
      yieldDailyMinPct: form.yieldDailyMinPct,
      yieldDailyMaxPct: form.yieldDailyMaxPct,
      yieldCatchUpCapPct: form.yieldCatchUpCapPct,
      teamEnergyEnabled: form.teamEnergyEnabled,
      teamEnergyDepth: form.teamEnergyDepth,
      teamEnergyPct: pct,
      communityEnabled: form.communityEnabled,
      communityPct: form.communityPct,
    };
    setSaving(true);
    try {
      const updated = await updateMut.mutateAsync(body);
      setForm(updated);
      setTeamEnergyPctText(updated.teamEnergyPct.join(", "));
      toast.success("Compensation settings saved");
    } catch {
      /* interceptor toasts (400 validation) */
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Compensation Settings"
        description="Global compensation knobs plus manual engine triggers. Knobs take effect on the next run."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Dashboard", to: "/app" }, { label: "Admin", to: "/app/admin" }, { label: "Compensation" }]}
      />

      <div className="mt-6 space-y-6">
        {/* Settings form */}
        <Card className="border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <SlidersHorizontal className="size-4 text-primary" /> Compensation knobs
            </CardTitle>
            <CardDescription>Direct connect bonus, trade yield, team energy, and community monthly percentages.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading || !form ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="directBonusPct">DIRECT CONNECT BONUS (%)</Label>
                    <Input
                      id="directBonusPct"
                      type="number"
                      min={0}
                      max={100}
                      value={form.directBonusPct}
                      onChange={(e) => patch("directBonusPct", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="communityPct">Community bonus — legacy % (unused)</Label>
                    <Input
                      id="communityPct"
                      type="number"
                      min={0}
                      max={100}
                      value={form.communityPct}
                      onChange={(e) => patch("communityPct", Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      The Community Monthly Bonus now pays a fixed $ amount per qualified star (see payouts below). This knob is kept for compatibility and no longer affects the payout.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teamEnergyDepth">Team energy depth (max star)</Label>
                    <Input
                      id="teamEnergyDepth"
                      type="number"
                      min={0}
                      max={10}
                      value={form.teamEnergyDepth}
                      onChange={(e) => patch("teamEnergyDepth", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teamEnergyPct">Level percentages (L1…L10, comma-separated)</Label>
                    <Input
                      id="teamEnergyPct"
                      placeholder="10, 5, 4, 3, 2, 1, 0.5, 0.5, 0.25, 0.25"
                      value={teamEnergyPctText}
                      onChange={(e) => setTeamEnergyPctText(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">One percentage per level, index = level − 1. Level L pays its rate on that level's downline yield, stacked within your star's depth (a 2★ earns L1 at the L1 rate AND L2 at the L2 rate).</p>
                  </div>
                </div>

                <Toggle
                  label="Trade yield enabled"
                  description="Credit daily trade yield to active packages."
                  checked={form.yieldEnabled}
                  onChange={(v) => patch("yieldEnabled", v)}
                />

                {/* Trade yield schedule — flexible daily band that lands on the
                    monthly target exactly (catch-up rates when behind). */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="monthlyYieldCapPct">Monthly yield target (% of package price)</Label>
                    <Input
                      id="monthlyYieldCapPct"
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
                      value={form.monthlyYieldCapPct}
                      onChange={(e) => patch("monthlyYieldCapPct", Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">Total yield credited per calendar month (0 = no cap/schedule).</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yieldCatchUpCapPct">Catch-up rate cap (%)</Label>
                    <Input
                      id="yieldCatchUpCapPct"
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
                      value={form.yieldCatchUpCapPct}
                      onChange={(e) => patch("yieldCatchUpCapPct", Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">Max single-day rate when the month must catch up to the target.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yieldDailyMinPct">Daily yield minimum (%)</Label>
                    <Input
                      id="yieldDailyMinPct"
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
                      value={form.yieldDailyMinPct}
                      onChange={(e) => patch("yieldDailyMinPct", Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">Weak-trade day rate.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yieldDailyMaxPct">Daily yield maximum (%)</Label>
                    <Input
                      id="yieldDailyMaxPct"
                      type="number"
                      min={0}
                      max={100}
                      step="0.1"
                      value={form.yieldDailyMaxPct}
                      onChange={(e) => patch("yieldDailyMaxPct", Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">Strong-trade day rate. Catch-up days may exceed this up to the cap.</p>
                  </div>
                </div>
                <Toggle
                  label="Team energy enabled"
                  description="Run the daily team-energy distribution."
                  checked={form.teamEnergyEnabled}
                  onChange={(v) => patch("teamEnergyEnabled", v)}
                />
                <Toggle
                  label="COMMUNITY MONTHLY BONUS enabled"
                  description="Run the monthly community-bonus distribution."
                  checked={form.communityEnabled}
                  onChange={(v) => patch("communityEnabled", v)}
                />

                <div className="flex justify-end">
                  <Button onClick={onSave} disabled={saving || !isDirty}>
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Triggers */}
        <TriggersCard />

        {/* Community Monthly Bonus payouts (spec §12) */}
        <CommunityPayoutsCard />
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Community payouts report                                           */
/* ------------------------------------------------------------------ */

function CommunityPayoutsCard() {
  const defaultMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(defaultMonth);
  const [report, setReport] = useState<AdminCommunityBonusReport | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(targetMonth: string, targetPage = 1) {
    setReport(null);
    setLoading(true);
    try {
      const data = await fetchCommunityReport(targetMonth || undefined, targetPage);
      setReport(data);
    } catch {
      /* interceptor toasts */
      setReport(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(defaultMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = report?.rows ?? [];
  const pagination = report?.pagination;

  return (
    <Card className="border-0">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-4 text-primary" /> Community monthly payouts
        </CardTitle>
        <CardDescription>
          Fixed monthly amounts paid per qualified star. Star qualification and amounts come from the backend — rows preserve what was actually paid.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="communityReportMonth">Distribution month</Label>
            <Input
              id="communityReportMonth"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-[180px]"
            />
          </div>
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => void load(month, 1)}
          >
            {loading ? "Loading…" : "Load payouts"}
          </Button>
          {report && (
            <div className="sm:ml-auto text-sm">
              <span className="text-muted-foreground">Total distributed: </span>
              <span className="font-medium tabular-nums">
                ${report.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="ml-3 text-muted-foreground">Users paid: </span>
              <span className="font-medium tabular-nums">{report.credited}</span>
            </div>
          )}
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading…" : report ? "No community payouts for this month." : ""}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">User</th>
                  <th className="py-2 pr-3 font-medium">Star</th>
                  <th className="py-2 pr-3 font-medium">Members</th>
                  <th className="py-2 pr-3 font-medium">Amount</th>
                  <th className="py-2 pr-3 font-medium">Month</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Transaction</th>
                  <th className="py-2 font-medium">Paid at</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-3">
                      <div className="font-medium">{r.userName}</div>
                      <div className="text-xs text-muted-foreground">{r.userEmail}</div>
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{r.starLevel}★</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {r.qualifyingTeamMembers ?? "—"} / {r.requiredTeamMembers ?? "—"}
                    </td>
                    <td className="py-2 pr-3 font-medium tabular-nums">
                      ${r.bonusAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{r.distributionMonth}</td>
                    <td className="py-2 pr-3 capitalize">{r.status}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{r.id}</td>
                    <td className="py-2 text-xs tabular-nums">{new Date(r.paymentDate).toISOString().slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <Pagination
            page={pagination.page}
            pageCount={pagination.totalPages}
            onPageChange={(p) => void load(month, p)}
            className="justify-center"
          />
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Toggle row                                                          */
/* ------------------------------------------------------------------ */

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Engine triggers                                                     */
/* ------------------------------------------------------------------ */

function TriggersCard() {
  const [date, setDate] = useState("");
  const [month, setMonth] = useState("");
  const [userId, setUserId] = useState("");
  const [busy, setBusy] = useState<string>("");

  async function run(label: string, fn: () => Promise<TriggerResult>) {
    setBusy(label);
    try {
      const result = await fn();
      toast.success(`${label} complete: ${summarize(result)}`);
    } catch {
      /* interceptor toasts */
    } finally {
      setBusy("");
    }
  }

  return (
    <Card className="border-0">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="size-4 text-primary" /> Engine triggers
        </CardTitle>
        <CardDescription>Manually run a compensation pass. Date/month default to today if left blank.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="triggerDate">Date (yield / team energy)</Label>
            <Input id="triggerDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="triggerMonth">Month (community)</Label>
            <Input id="triggerMonth" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="triggerUser">User ID (optional — bonanza / rank)</Label>
            <Input
              id="triggerUser"
              placeholder="Leave blank to run for all users"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              spellCheck={false}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy !== ""} onClick={() => run("Yield", () => runYieldTrigger(date || undefined))}>
            {busy === "Yield" ? "Running…" : "Run yield"}
          </Button>
          <Button variant="outline" disabled={busy !== ""} onClick={() => run("Team energy", () => runTeamEnergyTrigger(date || undefined))}>
            {busy === "Team energy" ? "Running…" : "Run team energy"}
          </Button>
          <Button variant="outline" disabled={busy !== ""} onClick={() => run("Community", () => runCommunityTrigger(month || undefined))}>
            {busy === "Community" ? "Running…" : "Run community"}
          </Button>
          <Button variant="outline" disabled={busy !== ""} onClick={() => run("Bonanzas", () => evaluateBonanzasTrigger(userId || undefined))}>
            {busy === "Bonanzas" ? "Running…" : "Evaluate bonanzas"}
          </Button>
          <Button variant="outline" disabled={busy !== ""} onClick={() => run("Rank check", () => runRankCheckTrigger(userId || undefined))}>
            {busy === "Rank check" ? "Running…" : "Run rank check"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Parse a comma-separated percentage string into a number[]. Null if invalid. */
function parsePctArray(text: string): number[] | null {
  if (!text.trim()) return [];
  const parts = text.split(",").map((s) => s.trim());
  const nums: number[] = [];
  for (const p of parts) {
    const n = Number(p);
    if (p === "" || Number.isNaN(n) || n < 0 || n > 100) return null;
    nums.push(n);
  }
  return nums.length > 10 ? null : nums;
}

function sameSettings(a: CompensationSettings, b: CompensationSettings, aText: string, bPct: number[]): boolean {
  return (
    a.directBonusPct === b.directBonusPct &&
    a.yieldEnabled === b.yieldEnabled &&
    a.monthlyYieldCapPct === b.monthlyYieldCapPct &&
    a.yieldDailyMinPct === b.yieldDailyMinPct &&
    a.yieldDailyMaxPct === b.yieldDailyMaxPct &&
    a.yieldCatchUpCapPct === b.yieldCatchUpCapPct &&
    a.teamEnergyEnabled === b.teamEnergyEnabled &&
    a.teamEnergyDepth === b.teamEnergyDepth &&
    parsePctArray(aText)?.join(",") === bPct.join(",") &&
    a.communityEnabled === b.communityEnabled &&
    a.communityPct === b.communityPct
  );
}

/** Compact summary of a trigger result object for the toast. */
function summarize(result: TriggerResult): string {
  const keys = ["processed", "credited", "evaluated", "awarded", "skipped", "expired", "errors"];
  const parts = keys
    .filter((k) => typeof result[k] === "number")
    .map((k) => `${k} ${result[k]}`);
  return parts.length ? parts.join(", ") : "done";
}