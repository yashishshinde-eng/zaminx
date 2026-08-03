import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema } from "@zaminex/shared";
import type { ResetPasswordBody } from "@zaminex/shared";
import toast from "react-hot-toast";
import { api } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/layout/Logo";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  useDocumentMeta({ title: "Reset password — Zaminex" });

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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto"><Logo className="size-12" /></div>
          <CardTitle className="text-2xl">Reset password</CardTitle>
          <CardDescription>Choose a new password for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          {!token && (
            <p className="mb-4 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
              No reset token was found in the link. Use the link from your reset email, or paste the token below.
            </p>
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
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Updating…" : "Update password"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link to="/login" className="font-medium text-primary hover:underline">Back to sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}