import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema } from "@zeminex/shared";
import type { ResetPasswordBody } from "@zeminex/shared";
import toast from "react-hot-toast";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/layout/Logo";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  useDocumentMeta({ title: "Reset password — Zeminex Global" });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordBody>({
    resolver: zodResolver(resetPasswordSchema.shape.body),
    defaultValues: { token },
  });

  const onSubmit = async (values: ResetPasswordBody) => {
    setSubmitting(true);
    try {
      await api.post("/auth/reset-password", { token: token || values.token, password: values.password });
      toast.success("Password updated. Please sign in.");
      navigate("/login", { replace: true });
    } catch {
      // Toast handled by the axios interceptor.
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
            <h1 className="font-grotesk text-2xl font-bold tracking-tight">Reset password</h1>
            <p className="mt-1 text-sm text-muted-foreground">Choose a new password for your account.</p>
          </div>

          {!token && (
            <div className="mb-4 rounded-[14px] border border-warning/30 bg-warning/5 p-3 text-sm text-warning">
              No reset token was found in the link. Use the link from your reset email, or paste the token below.
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {!token && (
              <div className="space-y-2">
                <Label htmlFor="token">Reset token</Label>
                <Input id="token" placeholder="Paste your token" {...register("token")} />
                {errors.token && <p className="text-sm text-destructive">{errors.token.message}</p>}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" {...register("password")} />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="submit" className="btn-premium w-full h-11" disabled={submitting}>
              {submitting ? "Updating…" : <>Update password <ArrowRight className="size-4" /></>}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link to="/login" className="font-medium text-gold hover:underline">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}