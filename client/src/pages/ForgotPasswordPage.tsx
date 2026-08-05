import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema } from "@zaminex/shared";
import type { ForgotPasswordBody } from "@zaminex/shared";
import toast from "react-hot-toast";
import { Mail, ArrowRight } from "lucide-react";
import { api } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/layout/Logo";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useDocumentMeta({ title: "Forgot password — Zaminex" });

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
      toast.success("If that email exists, a reset link has been sent.");
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

        <div className="glass-card p-8">
          <div className="mb-6 text-center">
            <h1 className="font-grotesk text-2xl font-bold tracking-tight">Forgot password</h1>
            <p className="mt-1 text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>
          </div>

          {sent ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="icon-box-blue size-12">
                <Mail className="size-5 text-gold" />
              </div>
              <p className="text-sm text-muted-foreground">
                If an account exists for that email, a reset link is on its way. Check your inbox and follow the link to set a new password.
              </p>
              <Button variant="outline" asChild className="w-full">
                <Link to="/login">Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
              <Button type="submit" className="btn-premium w-full h-11" disabled={submitting}>
                {submitting ? "Sending…" : <>Send reset link <ArrowRight className="size-4" /></>}
              </Button>
            </form>
          )}

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link to="/login" className="font-medium text-gold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}