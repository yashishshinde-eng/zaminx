import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Mail, Send } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useSmtpSettings, useUpdateSmtpSettings, useSendTestEmail } from "@/hooks/useAdmin";

/** /app/admin/smtp — edit non-secret SMTP fields (secrets stay env-only). */
export function AdminSmtpSettingsPage() {
  const { data, isLoading } = useSmtpSettings();
  const updateMut = useUpdateSmtpSettings();
  const testMut = useSendTestEmail();

  const [host, setHost] = useState("");
  const [port, setPort] = useState(587);
  const [from, setFrom] = useState("");
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState("");

  useEffect(() => {
    if (data) {
      setHost(data.host);
      setPort(data.port);
      setFrom(data.from);
    }
  }, [data]);

  const isDirty = Boolean(data && (data.host !== host || data.port !== port || data.from !== from));

  async function onSave() {
    setSaving(true);
    try {
      const updated = await updateMut.mutateAsync({ host, port, from });
      setHost(updated.host);
      setPort(updated.port);
      setFrom(updated.from);
      toast.success("SMTP settings saved");
    } catch {
      /* interceptor toasts (400 validation) */
    } finally {
      setSaving(false);
    }
  }

  async function onTest() {
    if (!testTo.trim()) return;
    try {
      await testMut.mutateAsync(testTo.trim());
      setTestTo("");
    } catch {
      /* interceptor toasts the SMTP error */
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="SMTP Settings"
        description="Outbound email configuration. Non-secret fields are stored here; SMTP credentials (user/password) are set via environment variables and never stored in the database."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Dashboard", to: "/app" }, { label: "Admin", to: "/app/admin" }, { label: "SMTP" }]}
      />

      <div className="mt-6 space-y-6">
        {isLoading || !data ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            <Card className="border-0">
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mail className="size-4 text-primary" /> SMTP server
                </CardTitle>
                <CardDescription>Connection + sender details for transactional email.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="smtpHost">Host</Label>
                    <Input id="smtpHost" value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">Port</Label>
                    <Input id="smtpPort" type="number" min={1} value={port} onChange={(e) => setPort(Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpFrom">From address</Label>
                    <Input id="smtpFrom" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Zeminex Global <noreply@zeminexglobal.com>" />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/30 p-4">
                  <span className="text-sm font-medium">Credentials (env):</span>
                  <Badge variant={data.passwordConfigured ? "success" : "secondary"}>
                    {data.passwordConfigured ? "Configured" : "Not configured"}
                  </Badge>
                  <Badge variant={data.configured ? "success" : "outline"}>
                    {data.configured ? "Ready to send" : "Not ready"}
                  </Badge>
                  <p className="w-full text-xs text-muted-foreground">
                    SMTP user &amp; password are read from the <code className="font-mono">SMTP_USER</code> / <code className="font-mono">SMTP_PASS</code> environment variables and cannot be edited here. Without them, outbound mail falls back to the dev file transport.
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button onClick={onSave} disabled={saving || !isDirty}>
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Test email */}
            <Card className="border-0">
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Send className="size-4 text-primary" /> Send test email
                </CardTitle>
                <CardDescription>Deliver a small test message to verify the configuration. In dev (no credentials) it is written to the server logs folder.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="testTo">Recipient</Label>
                  <Input id="testTo" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" />
                </div>
                <Button onClick={onTest} disabled={testMut.isPending || !testTo.trim()}>
                  {testMut.isPending ? "Sending…" : "Send test"}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}

export default AdminSmtpSettingsPage;