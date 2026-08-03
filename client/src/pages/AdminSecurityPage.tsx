import { useEffect, useState } from "react";
import { ShieldAlert, LogOut } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmModal } from "@/components/ui/dialog";
import { useMaintenanceSettings, useUpdateMaintenanceSettings, useForceLogoutAll } from "@/hooks/useAdmin";

/** /app/admin/security — maintenance toggle + force-logout-all (Phase 14C). */
export function AdminSecurityPage() {
  const { data, isLoading } = useMaintenanceSettings();
  const updateMut = useUpdateMaintenanceSettings();
  const logoutAllMut = useForceLogoutAll();

  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);

  useEffect(() => {
    if (data) {
      setEnabled(data.enabled);
      setMessage(data.message);
    }
  }, [data]);

  const isDirty = Boolean(data && (data.enabled !== enabled || data.message !== message));

  async function onSave() {
    setSaving(true);
    try {
      const updated = await updateMut.mutateAsync({ enabled, message });
      setEnabled(updated.enabled);
      setMessage(updated.message);
    } catch {
      /* interceptor toasts (400 validation) */
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Security & Maintenance"
        description="Platform-wide maintenance mode and session control."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Dashboard", to: "/app" }, { label: "Admin", to: "/app/admin" }, { label: "Security" }]}
      />

      <div className="mt-6 space-y-6">
        {isLoading || !data ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          <>
            {/* Maintenance */}
            <Card className="border-0">
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldAlert className="size-4 text-primary" /> Maintenance mode
                </CardTitle>
                <CardDescription>
                  When on, the API returns 503 to every non-admin request (except login/refresh/logout) and the public site shows the maintenance page. Admins always pass through.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Enabled</p>
                    <p className="text-sm text-muted-foreground">Take the platform offline for maintenance.</p>
                  </div>
                  <Switch checked={enabled} onCheckedChange={setEnabled} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maintenanceMessage">Message shown to users</Label>
                  <Input
                    id="maintenanceMessage"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="We'll be right back."
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={onSave} disabled={saving || !isDirty}>
                    {saving ? "Saving…" : "Save"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Force logout all */}
            <Card className="border-0">
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-base">
                  <LogOut className="size-4 text-primary" /> Force logout all
                </CardTitle>
                <CardDescription>
                  Invalidate every user's refresh token at once — except your own. Affected sessions can't renew and will need to log in again once their access token expires.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" onClick={() => setConfirmLogoutAll(true)} disabled={logoutAllMut.isPending}>
                  {logoutAllMut.isPending ? "Ending sessions…" : "Force logout everyone"}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <ConfirmModal
        open={confirmLogoutAll}
        onClose={() => setConfirmLogoutAll(false)}
        onConfirm={() => {
          logoutAllMut.mutate(undefined, { onSettled: () => setConfirmLogoutAll(false) });
        }}
        title="Force logout every user?"
        description="This ends every session except your own. Users will be signed out once their access token expires. This cannot be undone."
        confirmLabel="Force logout all"
        destructive
        loading={logoutAllMut.isPending}
      />
    </AppShell>
  );
}

export default AdminSecurityPage;