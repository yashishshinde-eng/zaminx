import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, MailWarning, Send } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { verifyEmailRequest, resendVerificationRequest } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/layout/Logo";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { cn } from "@/lib/utils";

type State = "verifying" | "success" | "error";

export function VerifyEmailPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const { refreshUser, isAuthenticated } = useAuth();
  const [state, setState] = useState<State>("verifying");
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);

  useDocumentMeta({ title: "Verify email" });

  useEffect(() => {
    if (!token) {
      setState("error");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await verifyEmailRequest(token);
        if (cancelled) return;
        setState("success");
        if (isAuthenticated) refreshUser().catch(() => undefined);
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, isAuthenticated, refreshUser]);

  const onResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setResending(true);
    try {
      await resendVerificationRequest(email);
      toast.success(t("verifyEmail.resentToast"));
    } catch {
      // Interceptor toasts on network error.
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background bg-depth p-4">
      <Card className={cn("w-full max-w-md", state === "success" ? "neon-card neon-green" : "border-0 shadow-card")}>
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto"><Logo className="size-12" /></div>
          <CardTitle className="text-2xl">{t("verifyEmail.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {state === "verifying" && (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("verifyEmail.verifying")}</p>
          )}

          {state === "success" && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="size-6" />
              </div>
              <p className="text-sm text-muted-foreground">{t("verifyEmail.successMessage")}</p>
              <Button className="w-full" asChild>
                <Link to={isAuthenticated ? "/app" : "/login"}>{t("verifyEmail.continue")}</Link>
              </Button>
            </div>
          )}

          {state === "error" && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <MailWarning className="size-6" />
              </div>
              <p className="text-sm text-muted-foreground">
                {token
                  ? t("verifyEmail.invalidOrExpired")
                  : t("verifyEmail.noToken")}
              </p>
              <form onSubmit={onResend} className="w-full space-y-3 text-left">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("verifyEmail.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={resending}>
                  {resending ? (
                    t("verifyEmail.sending")
                  ) : (
                    <>
                      <Send className="size-4" /> {t("verifyEmail.resend")}
                    </>
                  )}
                </Button>
              </form>
            </div>
          )}

          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link to="/login" className="font-medium text-primary hover:underline">{t("verifyEmail.backToSignIn")}</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default VerifyEmailPage;