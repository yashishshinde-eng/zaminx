import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema } from "@zeminex/shared";
import type { ForgotPasswordBody } from "@zeminex/shared";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Mail, ArrowRight } from "lucide-react";
import { api } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/layout/Logo";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useDocumentMeta({ title: "Forgot password — Zeminex Global" });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordBody>({ resolver: zodResolver(forgotPasswordSchema.shape.body) });

  const onSubmit = async (values: ForgotPasswordBody) => {
    setSubmitting(true);
    try {
      await api.post("/auth/forgot-password", values);
      setSent(true);
      toast.success(t("forgotPassword.sentToast"));
    } catch {
      // The endpoint always responds 200; interceptors may still toast on network error.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background bg-depth p-4">
      <div className="w-full max-w-md">
        <div className="mx-auto mb-8 text-center">
          <Logo className="mx-auto size-12 shadow-glow-blue" />
        </div>

        <div className="glass-card p-6 sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="font-grotesk text-2xl font-bold tracking-tight">{t("forgotPassword.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("forgotPassword.subtitle")}</p>
          </div>

          {sent ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="icon-box-blue size-12">
                <Mail className="size-5 text-gold" />
              </div>
              <p className="text-sm text-muted-foreground">
                {t("forgotPassword.sentMessage")}
              </p>
              <Button variant="outline" asChild className="w-full">
                <Link to="/login">{t("forgotPassword.backToSignIn")}</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">{t("forgotPassword.email")}</Label>
                <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
              <Button type="submit" className="btn-premium w-full h-11" disabled={submitting}>
                {submitting ? t("forgotPassword.sending") : <>{t("forgotPassword.sendResetLink")} <ArrowRight className="size-4" /></>}
              </Button>
            </form>
          )}

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t("forgotPassword.rememberedIt")}{" "}
            <Link to="/login" className="font-medium text-gold hover:underline">{t("forgotPassword.signIn")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}