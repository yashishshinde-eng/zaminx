import { forwardRef, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Eye, EyeOff, Wallet, KeyRound, Sun, Moon, Bell, UserCog, CheckCircle2, Mail, BadgeCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { staggerContainer, staggerItem } from "@/lib/motion";
import {
  updateProfileRequest,
  updateWalletAddressesRequest,
  changePasswordRequest,
  updateNotificationPreferenceRequest,
} from "@/lib/profile";
import {
  updateProfileSchema,
  updateWalletAddressesSchema,
} from "@zaminex/shared";
import type { UpdateProfileBody, UpdateWalletAddressesBody } from "@zaminex/shared";

export function SettingsPage() {
  const { user } = useAuth();

  return (
    <AppShell>
      <PageHeader
        title="Settings"
        description="Manage your account, security, and preferences."
        breadcrumbs={[{ label: "Dashboard", to: "/app" }, { label: "Settings" }]}
      />

      {!user ? (
        <div className="mt-6 text-sm text-muted-foreground">Loading your profile…</div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="mt-6 space-y-6"
        >
          <motion.div variants={staggerItem}>
            <ProfileHeader />
          </motion.div>
          <motion.div variants={staggerItem}>
            <PersonalDetailsForm />
          </motion.div>
          <motion.div variants={staggerItem}>
            <WalletAddressForm />
          </motion.div>
          <motion.div variants={staggerItem}>
            <PasswordForm />
          </motion.div>
          <motion.div variants={staggerItem}>
            <ThemeSection />
          </motion.div>
          <motion.div variants={staggerItem}>
            <NotificationsForm />
          </motion.div>
        </motion.div>
      )}
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  0. Profile header                                                  */
/* ------------------------------------------------------------------ */
function ProfileHeader() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <Card className="glass overflow-hidden">
      <div className="brand-gradient h-1.5 w-full" />
      <CardContent className="flex flex-wrap items-center gap-4 p-5">
        <Avatar src={null} alt={user.name} fallback={user.name} size="lg" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-semibold">{user.name}</h2>
            {user.isEmailVerified ? (
              <Badge variant="success" className="gap-1">
                <BadgeCheck className="size-3.5" /> Verified
              </Badge>
            ) : (
              <Badge variant="warning" className="gap-1">
                Unverified
              </Badge>
            )}
          </div>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Mail className="size-3.5" /> {user.email}
          </p>
          <p className="mt-0.5 text-xs capitalize text-muted-foreground">{user.role} account</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  1. Personal details                                                */
/* ------------------------------------------------------------------ */
function PersonalDetailsForm() {
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileBody>({
    resolver: zodResolver(updateProfileSchema.shape.body),
    defaultValues: { name: user?.name ?? "", phone: user?.phone ?? "" },
  });

  useEffect(() => {
    reset({ name: user?.name ?? "", phone: user?.phone ?? "" });
  }, [user, reset]);

  const onSubmit = async (values: UpdateProfileBody) => {
    setSaving(true);
    try {
      await updateProfileRequest({ name: values.name, phone: values.phone });
      await refreshUser();
      toast.success("Profile updated");
    } catch {
      /* interceptor toasts */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserCog className="size-4 text-primary" /> Personal details
        </CardTitle>
        <CardDescription>Your name and phone number.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" autoComplete="name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input id="phone" autoComplete="tel" placeholder="+1 555 010 0000" {...register("phone")} />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={saving || !isDirty}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  2. Wallet address (USDT-BEP20)                                     */
/* ------------------------------------------------------------------ */
function WalletAddressForm() {
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateWalletAddressesBody>({
    resolver: zodResolver(updateWalletAddressesSchema.shape.body),
    defaultValues: { usdtBep20: user?.walletAddresses?.usdtBep20 ?? "" },
  });

  useEffect(() => {
    reset({ usdtBep20: user?.walletAddresses?.usdtBep20 ?? "" });
  }, [user, reset]);

  const onSubmit = async (values: UpdateWalletAddressesBody) => {
    setSaving(true);
    try {
      await updateWalletAddressesRequest({ usdtBep20: values.usdtBep20 });
      await refreshUser();
      toast.success("Wallet address saved");
    } catch {
      /* interceptor toasts */
    } finally {
      setSaving(false);
    }
  };

  const hasAddress = Boolean(user?.walletAddresses?.usdtBep20);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="size-4 text-primary" /> Wallet address
        </CardTitle>
        <CardDescription>
          Used for deposits and withdrawals. Only USDT-BEP20 (BNB Smart Chain) is supported.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="usdtBep20">USDT-BEP20 address</Label>
            <div className="flex items-center gap-2">
              <Input
                id="usdtBep20"
                placeholder="0x…"
                spellCheck={false}
                autoComplete="off"
                {...register("usdtBep20")}
              />
              {hasAddress && (
                <CheckCircle2 className="size-5 shrink-0 text-emerald-600" aria-label="Address set" />
              )}
            </div>
            {errors.usdtBep20 && <p className="text-sm text-destructive">{errors.usdtBep20.message}</p>}
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving || !isDirty}>
              {saving ? "Saving…" : "Save address"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  3. Password                                                        */
/* ------------------------------------------------------------------ */
const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  confirmPassword: z.string().min(1, "Confirm your new password"),
});
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

function PasswordForm() {
  const [saving, setSaving] = useState(false);
  const [show, setShow] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: PasswordFormValues) => {
    if (values.password !== values.confirmPassword) {
      setError("confirmPassword", { message: "Passwords do not match" });
      return;
    }
    setSaving(true);
    try {
      await changePasswordRequest({ currentPassword: values.currentPassword, password: values.password });
      reset({ currentPassword: "", password: "", confirmPassword: "" });
      toast.success("Password updated");
    } catch {
      /* interceptor toasts (400 on wrong current password) */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="size-4 text-primary" /> Password
        </CardTitle>
        <CardDescription>Choose a new password. Your session stays active.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <PasswordInput id="currentPassword" show={show} setShow={setShow} {...register("currentPassword")} />
            {errors.currentPassword && <p className="text-sm text-destructive">{errors.currentPassword.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <PasswordInput id="password" show={show} setShow={setShow} {...register("password")} />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <PasswordInput id="confirmPassword" show={show} setShow={setShow} {...register("confirmPassword")} />
              {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving || !isDirty}>
              {saving ? "Updating…" : "Update password"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/** Password input with a show/hide toggle (forwards ref for react-hook-form). */
const PasswordInput = forwardRef<HTMLInputElement, {
  show: boolean;
  setShow: (v: boolean) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">>(
  ({ show, setShow, ...props }, ref) => (
    <div className="relative">
      <Input ref={ref} type={show ? "text" : "password"} className="pr-10" {...props} />
      <button
        type="button"
        onClick={() => setShow(!show)}
        aria-label={show ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  ),
);
PasswordInput.displayName = "PasswordInput";

/* ------------------------------------------------------------------ */
/*  4. Theme                                                           */
/* ------------------------------------------------------------------ */
function ThemeSection() {
  const { theme, setTheme } = useTheme();
  const options: { value: "light" | "dark"; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sun className="size-4 text-primary" /> Theme
        </CardTitle>
        <CardDescription>Synced to your account and applied on every device.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {options.map((o) => {
            const active = theme === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => setTheme(o.value)}
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-4 text-left transition-colors",
                  active ? "border-primary bg-primary/5" : "hover:bg-muted/40",
                )}
              >
                <o.icon className={cn("size-5", active ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("font-medium", active ? "text-foreground" : "text-muted-foreground")}>
                  {o.label}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  5. Notifications                                                   */
/* ------------------------------------------------------------------ */
function NotificationsForm() {
  const { user, refreshUser } = useAuth();
  const [prefs, setPrefs] = useState({ email: true, dashboard: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) setPrefs(user.notificationPreference);
  }, [user]);

  const toggle = async (key: "email" | "dashboard", value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSaving(true);
    try {
      await updateNotificationPreferenceRequest(next);
      await refreshUser();
      toast.success("Notification preference updated");
    } catch {
      setPrefs(prefs); // revert on failure
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="size-4 text-primary" /> Notifications
        </CardTitle>
        <CardDescription>Choose how you want to hear from us.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div>
            <p className="font-medium">Email notifications</p>
            <p className="text-sm text-muted-foreground">Account, earning, and withdrawal alerts by email.</p>
          </div>
          <Switch checked={prefs.email} disabled={saving} onCheckedChange={(v) => toggle("email", v)} />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div>
            <p className="font-medium">Dashboard notifications</p>
            <p className="text-sm text-muted-foreground">Show alerts in your dashboard.</p>
          </div>
          <Switch checked={prefs.dashboard} disabled={saving} onCheckedChange={(v) => toggle("dashboard", v)} />
        </div>
      </CardContent>
    </Card>
  );
}

export default SettingsPage;