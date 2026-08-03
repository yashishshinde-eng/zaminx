import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Settings as SettingsIcon, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useSiteConfigAdmin, useUpdateSiteConfig } from "@/hooks/useAdmin";
import type { SiteConfigUpdate } from "@zaminex/shared";

const EMPTY: SiteConfigUpdate = {
  siteName: "",
  tagline: "",
  logoLight: "",
  logoDark: "",
  navLinks: [],
  footerText: "",
  contactDetails: { email: "", phone: "", address: "" },
  socialLinks: { twitter: "", telegram: "", instagram: "", facebook: "", youtube: "" },
  seoDefaults: { title: "", description: "" },
  announcementBar: { enabled: false, message: "", link: "", linkLabel: "" },
};

/** /app/admin/site-config — edit the 9 public `cms.*` fields. */
export function AdminSiteConfigPage() {
  const { data, isLoading } = useSiteConfigAdmin();
  const updateMut = useUpdateSiteConfig();

  const [form, setForm] = useState<SiteConfigUpdate>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setForm(normalize(data));
      setLoaded(true);
    }
  }, [data]);

  const isDirty = Boolean(loaded && !sameConfig(form, normalize(data ?? EMPTY)));

  function patch<K extends keyof SiteConfigUpdate>(key: K, value: SiteConfigUpdate[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSave() {
    if (!loaded) return;
    setSaving(true);
    try {
      const updated = await updateMut.mutateAsync(form);
      setForm(normalize(updated));
      toast.success("Site configuration saved");
    } catch {
      /* interceptor toasts (400 validation) */
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Site Configuration"
        description="Public website settings: branding, navigation, contact details, social links, SEO defaults, and the announcement bar."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Dashboard", to: "/app" }, { label: "Admin", to: "/app/admin" }, { label: "Site Config" }]}
      />

      <div className="mt-6 space-y-6">
        {isLoading || !loaded ? (
          <Skeleton className="h-[480px] w-full" />
        ) : (
          <>
            {/* Branding */}
            <Card className="border-0">
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-base">
                  <SettingsIcon className="size-4 text-primary" /> Branding
                </CardTitle>
                <CardDescription>Site name, tagline, and logos (URLs; leave blank for the text logo).</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Site name</Label>
                  <Input id="siteName" value={form.siteName ?? ""} onChange={(e) => patch("siteName", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input id="tagline" value={form.tagline ?? ""} onChange={(e) => patch("tagline", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logoLight">Logo (light mode URL)</Label>
                  <Input id="logoLight" value={form.logoLight ?? ""} onChange={(e) => patch("logoLight", e.target.value)} placeholder="https://…" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logoDark">Logo (dark mode URL)</Label>
                  <Input id="logoDark" value={form.logoDark ?? ""} onChange={(e) => patch("logoDark", e.target.value)} placeholder="https://…" />
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <Card className="border-0">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">Navigation links</CardTitle>
                <CardDescription>The header navigation. Reorder by removing and re-adding.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(form.navLinks ?? []).map((link, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      className="h-9 w-[180px]"
                      placeholder="Label"
                      value={link.label}
                      onChange={(e) => patchNavLinks(form, setForm, i, { ...link, label: e.target.value })}
                    />
                    <Input
                      className="h-9 flex-1"
                      placeholder="Href"
                      value={link.href}
                      onChange={(e) => patchNavLinks(form, setForm, i, { ...link, href: e.target.value })}
                    />
                    <Button size="icon" variant="ghost" onClick={() => patch("navLinks", (form.navLinks ?? []).filter((_, j) => j !== i))}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => patch("navLinks", [...(form.navLinks ?? []), { label: "", href: "" }])}
                >
                  <Plus className="size-4" /> Add link
                </Button>
              </CardContent>
            </Card>

            {/* Footer + contact + social */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-0">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-base">Footer & contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="footerText">Footer text</Label>
                    <Input id="footerText" value={form.footerText ?? ""} onChange={(e) => patch("footerText", e.target.value)} />
                  </div>
                  {(["email", "phone", "address"] as const).map((k) => (
                    <div key={k} className="space-y-2">
                      <Label htmlFor={`contact-${k}`}>Contact {k}</Label>
                      <Input
                        id={`contact-${k}`}
                        value={form.contactDetails?.[k] ?? ""}
                        onChange={(e) => patch("contactDetails", { ...form.contactDetails, [k]: e.target.value })}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-0">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-base">Social links</CardTitle>
                  <CardDescription>Full profile URLs. Leave blank to hide an icon.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  {(["twitter", "telegram", "instagram", "facebook", "youtube"] as const).map((k) => (
                    <div key={k} className="space-y-2">
                      <Label htmlFor={`social-${k}`} className="capitalize">{k}</Label>
                      <Input
                        id={`social-${k}`}
                        value={form.socialLinks?.[k] ?? ""}
                        onChange={(e) => patch("socialLinks", { ...form.socialLinks, [k]: e.target.value })}
                        placeholder="https://…"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* SEO + announcement */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-0">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-base">SEO defaults</CardTitle>
                  <CardDescription>Fallback title & description for pages without explicit SEO.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="seoTitle">Title</Label>
                    <Input id="seoTitle" value={form.seoDefaults?.title ?? ""} onChange={(e) => patch("seoDefaults", { ...form.seoDefaults, title: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="seoDesc">Description</Label>
                    <Input id="seoDesc" value={form.seoDefaults?.description ?? ""} onChange={(e) => patch("seoDefaults", { ...form.seoDefaults, description: e.target.value })} />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-base">Announcement bar</CardTitle>
                  <CardDescription>A dismissible banner shown at the top of the public site.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                    <div>
                      <p className="font-medium">Enabled</p>
                      <p className="text-sm text-muted-foreground">Show the announcement bar.</p>
                    </div>
                    <Switch checked={form.announcementBar?.enabled ?? false} onCheckedChange={(v) => patchAnnouncement(form, setForm, "enabled", v)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="annMsg">Message</Label>
                    <Input id="annMsg" value={form.announcementBar?.message ?? ""} onChange={(e) => patchAnnouncement(form, setForm, "message", e.target.value)} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="annLink">Link URL</Label>
                      <Input id="annLink" value={form.announcementBar?.link ?? ""} onChange={(e) => patchAnnouncement(form, setForm, "link", e.target.value)} placeholder="/promo" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="annLabel">Link label</Label>
                      <Input id="annLabel" value={form.announcementBar?.linkLabel ?? ""} onChange={(e) => patchAnnouncement(form, setForm, "linkLabel", e.target.value)} placeholder="Learn more" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button onClick={onSave} disabled={saving || !isDirty}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Coerce a possibly-partial server payload into a fully-populated form. */
function normalize(c: SiteConfigUpdate): SiteConfigUpdate {
  return {
    siteName: c.siteName ?? "",
    tagline: c.tagline ?? "",
    logoLight: c.logoLight ?? "",
    logoDark: c.logoDark ?? "",
    navLinks: c.navLinks ?? [],
    footerText: c.footerText ?? "",
    contactDetails: { ...EMPTY.contactDetails, ...(c.contactDetails ?? {}) },
    socialLinks: { ...EMPTY.socialLinks, ...(c.socialLinks ?? {}) },
    seoDefaults: { ...EMPTY.seoDefaults, ...(c.seoDefaults ?? {}) },
    announcementBar: {
      enabled: c.announcementBar?.enabled ?? false,
      message: c.announcementBar?.message ?? "",
      link: c.announcementBar?.link ?? "",
      linkLabel: c.announcementBar?.linkLabel ?? "",
    },
  };
}

function patchNavLinks(
  form: SiteConfigUpdate,
  setForm: (updater: (prev: SiteConfigUpdate) => SiteConfigUpdate) => void,
  index: number,
  link: { label: string; href: string },
) {
  const next = [...(form.navLinks ?? [])];
  next[index] = link;
  setForm((prev) => ({ ...prev, navLinks: next }));
}

/** Patch one field of the announcement bar, always emitting a fully-populated object. */
function patchAnnouncement(
  form: SiteConfigUpdate,
  setForm: (updater: (prev: SiteConfigUpdate) => SiteConfigUpdate) => void,
  key: "enabled" | "message" | "link" | "linkLabel",
  value: string | boolean,
) {
  const base = form.announcementBar ?? EMPTY.announcementBar;
  setForm((prev) => ({ ...prev, announcementBar: { ...base, [key]: value } as NonNullable<SiteConfigUpdate["announcementBar"]> }));
}

function sameConfig(a: SiteConfigUpdate, b: SiteConfigUpdate): boolean {
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

export default AdminSiteConfigPage;