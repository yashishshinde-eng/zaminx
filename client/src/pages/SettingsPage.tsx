import { forwardRef, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { Eye, EyeOff, Wallet, KeyRound, Bell, UserCog, CheckCircle2, Mail, BadgeCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { staggerContainer, staggerItem } from "@/lib/motion";
import { sanitizePinEvent } from "@/lib/pin";
import {
  updateProfileRequest,
  updateWalletAddressesRequest,
  changePasswordRequest,
  changeTransactionPasswordRequest,
  updateNotificationPreferenceRequest,
} from "@/lib/profile";
import {
  updateProfileSchema,
  updateWalletAddressesSchema,
} from "@zeminex/shared";
import type { UpdateProfileBody, UpdateWalletAddressesBody } from "@zeminex/shared";

export function SettingsPage() {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <AppShell>
      <PageHeader
        title={t("settings.title")}
        description={t("settings.description")}
        breadcrumbs={[{ label: t("common.dashboard"), to: "/app" }, { label: t("settings.title") }]}
      />

      {!user ? (
        <div className="mt-6 text-sm text-muted-foreground">{t("settings.loadingProfile")}</div>
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
            <TransactionPinForm />
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
  const { t } = useTranslation();
  if (!user) return null;
  return (
    <Card className="overflow-hidden border-0 shadow-card">
      <div className="gradient-blue h-1.5 w-full" />
      <CardContent className="flex flex-wrap items-center gap-4 p-5">
        <Avatar src={null} alt={user.name} fallback={user.name} size="lg" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-lg font-semibold">{user.name}</h2>
            {user.isEmailVerified ? (
              <Badge variant="success" className="gap-1">
                <BadgeCheck className="size-3.5" /> {t("settings.verified")}
              </Badge>
            ) : (
              <Badge variant="warning" className="gap-1">
                {t("settings.unverified")}
              </Badge>
            )}
          </div>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Mail className="size-3.5" /> {user.email}
          </p>
          <p className="mt-0.5 text-xs capitalize text-muted-foreground">{t("settings.roleAccount", { role: user.role })}</p>
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
  const { t } = useTranslation();
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
      toast.success(t("settings.profileUpdated"));
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
          <UserCog className="size-4 text-primary" /> {t("settings.personalDetails")}
        </CardTitle>
        <CardDescription>{t("settings.personalDetailsDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">{t("settings.fullName")}</Label>
            <Input id="name" autoComplete="name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t("settings.phoneOptional")}</Label>
            <Input id="phone" autoComplete="tel" placeholder="+1 555 010 0000" {...register("phone")} />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={saving || !isDirty}>
              {saving ? t("settings.saving") : t("common.save")}
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
  const { t } = useTranslation();
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
      toast.success(t("settings.walletAddressSaved"));
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
          <Wallet className="size-4 text-primary" /> {t("settings.walletAddress")}
        </CardTitle>
        <CardDescription>
          {t("settings.walletAddressDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="usdtBep20">{t("settings.usdtBep20Address")}</Label>
            <div className="flex items-center gap-2">
              <Input
                id="usdtBep20"
                placeholder="0x…"
                spellCheck={false}
                autoComplete="off"
                {...register("usdtBep20")}
              />
              {hasAddress && (
                <CheckCircle2 className="size-5 shrink-0 text-emerald-600" aria-label={t("settings.addressSet")} />
              )}
            </div>
            {errors.usdtBep20 && <p className="text-sm text-destructive">{errors.usdtBep20.message}</p>}
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving || !isDirty}>
              {saving ? t("settings.saving") : t("settings.saveAddress")}
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
  const { t } = useTranslation();
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
      setError("confirmPassword", { message: t("settings.passwordsDoNotMatch") });
      return;
    }
    setSaving(true);
    try {
      await changePasswordRequest({ currentPassword: values.currentPassword, password: values.password });
      reset({ currentPassword: "", password: "", confirmPassword: "" });
      toast.success(t("settings.passwordUpdated"));
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
          <KeyRound className="size-4 text-primary" /> {t("settings.password")}
        </CardTitle>
        <CardDescription>{t("settings.passwordDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="currentPassword">{t("settings.currentPassword")}</Label>
            <PasswordInput id="currentPassword" show={show} setShow={setShow} {...register("currentPassword")} />
            {errors.currentPassword && <p className="text-sm text-destructive">{errors.currentPassword.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="password">{t("settings.newPassword")}</Label>
              <PasswordInput id="password" show={show} setShow={setShow} {...register("password")} />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("settings.confirmNewPassword")}</Label>
              <PasswordInput id="confirmPassword" show={show} setShow={setShow} {...register("confirmPassword")} />
              {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving || !isDirty}>
              {saving ? t("settings.updating") : t("settings.updatePassword")}
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
  ({ show, setShow, ...props }, ref) => {
    const { t } = useTranslation();
    return (
      <div className="relative">
        <Input ref={ref} type={show ? "text" : "password"} className="pr-10" {...props} />
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-label={show ? t("settings.hidePassword") : t("settings.showPassword")}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";

/* ------------------------------------------------------------------ */
/*  3b. Transaction PIN                                                */
/* ------------------------------------------------------------------ */
const pinFormSchema = z.object({
  currentTransactionPassword: z.string().max(4).optional(),
  transactionPassword: z.string().length(4, "Transaction PIN must be exactly 4 digits").regex(/^\d{4}$/, "Transaction PIN must be exactly 4 digits"),
  confirmTransactionPassword: z.string().min(1, "Confirm your new PIN"),
});
type PinFormValues = z.infer<typeof pinFormSchema>;

function TransactionPinForm() {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [show, setShow] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors, isDirty },
  } = useForm<PinFormValues>({
    resolver: zodResolver(pinFormSchema),
    defaultValues: { currentTransactionPassword: "", transactionPassword: "", confirmTransactionPassword: "" },
  });

  const onSubmit = async (values: PinFormValues) => {
    if (values.transactionPassword !== values.confirmTransactionPassword) {
      setError("confirmTransactionPassword", { message: t("settings.pinsDoNotMatch") });
      return;
    }
    setSaving(true);
    try {
      await changeTransactionPasswordRequest({
        // Omit the current field entirely when blank so the server treats it
        // as "no current supplied" rather than an empty string.
        currentTransactionPassword: values.currentTransactionPassword || undefined,
        transactionPassword: values.transactionPassword,
      });
      reset({ currentTransactionPassword: "", transactionPassword: "", confirmTransactionPassword: "" });
      toast.success(t("settings.transactionPinUpdated"));
    } catch {
      /* interceptor toasts (400 on wrong current PIN) */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="size-4 text-primary" /> {t("settings.transactionPin")}
        </CardTitle>
        <CardDescription>
          {t("settings.transactionPinDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="currentTransactionPassword">{t("settings.currentPin")} <span className="text-muted-foreground">{t("settings.ifSet")}</span></Label>
            <PasswordInput
              id="currentTransactionPassword"
              show={show}
              setShow={setShow}
              inputMode="numeric"
              maxLength={4}
              pattern="\d*"
              autoComplete="off"
              placeholder="••••"
              className="tracking-[0.5em] pr-10"
              {...register("currentTransactionPassword")}
              onChange={(e) =>
                setValue("currentTransactionPassword", sanitizePinEvent(e), { shouldValidate: true })
              }
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="transactionPassword">{t("settings.newPin")}</Label>
              <PasswordInput
                id="transactionPassword"
                show={show}
                setShow={setShow}
                inputMode="numeric"
                maxLength={4}
                pattern="\d*"
                autoComplete="off"
                placeholder="••••"
                className="tracking-[0.5em] pr-10"
                {...register("transactionPassword")}
                onChange={(e) =>
                  setValue("transactionPassword", sanitizePinEvent(e), { shouldValidate: true })
                }
              />
              {errors.transactionPassword && <p className="text-sm text-destructive">{errors.transactionPassword.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmTransactionPassword">{t("settings.confirmNewPin")}</Label>
              <PasswordInput
                id="confirmTransactionPassword"
                show={show}
                setShow={setShow}
                inputMode="numeric"
                maxLength={4}
                pattern="\d*"
                autoComplete="off"
                placeholder="••••"
                className="tracking-[0.5em] pr-10"
                {...register("confirmTransactionPassword")}
                onChange={(e) =>
                  setValue("confirmTransactionPassword", sanitizePinEvent(e), { shouldValidate: true })
                }
              />
              {errors.confirmTransactionPassword && <p className="text-sm text-destructive">{errors.confirmTransactionPassword.message}</p>}
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving || !isDirty}>
              {saving ? t("settings.updating") : t("settings.updatePin")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  5. Notifications                                                   */
/* ------------------------------------------------------------------ */
function NotificationsForm() {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();
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
      toast.success(t("settings.notificationPreferenceUpdated"));
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
          <Bell className="size-4 text-primary" /> {t("settings.notifications")}
        </CardTitle>
        <CardDescription>{t("settings.notificationsDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div>
            <p className="font-medium">{t("settings.emailNotifications")}</p>
            <p className="text-sm text-muted-foreground">{t("settings.emailNotificationsDesc")}</p>
          </div>
          <Switch checked={prefs.email} disabled={saving} onCheckedChange={(v) => toggle("email", v)} />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
          <div>
            <p className="font-medium">{t("settings.dashboardNotifications")}</p>
            <p className="text-sm text-muted-foreground">{t("settings.dashboardNotificationsDesc")}</p>
          </div>
          <Switch checked={prefs.dashboard} disabled={saving} onCheckedChange={(v) => toggle("dashboard", v)} />
        </div>
      </CardContent>
    </Card>
  );
}

export default SettingsPage;