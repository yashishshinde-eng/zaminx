import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { SlidersHorizontal, Zap } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared";
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
  type TriggerResult,
} from "@/lib/admin";
import type { CompensationSettings, CompensationSettingsBody } from "@zeminex/shared";

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
        description="The 7 global compensation knobs plus manual engine triggers. Knobs take effect on the next run."
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
                    <Label htmlFor="communityPct">COMMUNITY MONTHLY BONUS (%)</Label>
                    <Input
                      id="communityPct"
                      type="number"
                      min={0}
                      max={100}
                      value={form.communityPct}
                      onChange={(e) => patch("communityPct", Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teamEnergyDepth">Team energy depth</Label>
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
                    <Label htmlFor="teamEnergyPct">Team energy percentages (comma-separated)</Label>
                    <Input
                      id="teamEnergyPct"
                      placeholder="10, 5, 3, 2, 1"
                      value={teamEnergyPctText}
                      onChange={(e) => setTeamEnergyPctText(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">One percentage per depth level, up to 10.</p>
                  </div>
                </div>

                <Toggle
                  label="Trade yield enabled"
                  description="Credit daily trade yield to active packages."
                  checked={form.yieldEnabled}
                  onChange={(v) => patch("yieldEnabled", v)}
                />
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
      </div>
    </AppShell>
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