import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CreditCard } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useNowpaymentsSettings, useUpdateNowpaymentsSettings } from "@/hooks/useAdmin";

/** /app/admin/payments — edit non-secret NOWPayments fields (secrets env-only). */
export function AdminNowpaymentsSettingsPage() {
  const { data, isLoading } = useNowpaymentsSettings();
  const updateMut = useUpdateNowpaymentsSettings();

  const [baseUrl, setBaseUrl] = useState("");
  const [payCurrency, setPayCurrency] = useState("usdtbsc");
  const [sandbox, setSandbox] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setBaseUrl(data.baseUrl);
      setPayCurrency(data.payCurrency);
      setSandbox(data.sandbox);
    }
  }, [data]);

  const isDirty = Boolean(data && (data.baseUrl !== baseUrl || data.payCurrency !== payCurrency || data.sandbox !== sandbox));

  async function onSave() {
    setSaving(true);
    try {
      const updated = await updateMut.mutateAsync({ baseUrl, payCurrency, sandbox });
      setBaseUrl(updated.baseUrl);
      setPayCurrency(updated.payCurrency);
      setSandbox(updated.sandbox);
      toast.success("NOWPayments settings saved");
    } catch {
      /* interceptor toasts (400 validation) */
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="NOWPayments Settings"
        description="Deposit gateway configuration. Non-secret fields are stored here; the API key and IPN secret are set via environment variables and never stored in the database."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Dashboard", to: "/app" }, { label: "Admin", to: "/app/admin" }, { label: "NOWPayments" }]}
      />

      <div className="mt-6 space-y-6">
        {isLoading || !data ? (
          <Skeleton className="h-80 w-full" />
        ) : (
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="size-4 text-primary" /> Gateway
              </CardTitle>
              <CardDescription>Invoice API base URL, payout currency, and sandbox mode.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="npBaseUrl">API base URL</Label>
                  <Input id="npBaseUrl" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.nowpayments.io/v1" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="npCurrency">Pay currency</Label>
                  <Input id="npCurrency" value={payCurrency} onChange={(e) => setPayCurrency(e.target.value)} placeholder="usdtbsc" />
                  <p className="text-xs text-muted-foreground">The crypto currency users pay in (e.g. usdtbsc = USDT on BNB Smart Chain).</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-4">
                <span className="text-sm font-medium">API credentials (env):</span>
                <Badge variant={data.configured ? "success" : "secondary"}>
                  {data.configured ? "Configured" : "Not configured"}
                </Badge>
                <p className="w-full text-xs text-muted-foreground">
                  The API key &amp; IPN secret are read from <code className="font-mono">NOWPAYMENTS_API_KEY</code> / <code className="font-mono">NOWPAYMENTS_IPN_SECRET</code> and cannot be edited here.
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div>
                  <p className="font-medium">Sandbox mode</p>
                  <p className="text-sm text-muted-foreground">
                    Use the mock deposit flow (no real gateway calls). On when credentials are absent; toggle off for live payments.
                  </p>
                </div>
                <Switch checked={sandbox} onCheckedChange={setSandbox} />
              </div>

              <div className="flex justify-end">
                <Button onClick={onSave} disabled={saving || !isDirty}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

export default AdminNowpaymentsSettingsPage;