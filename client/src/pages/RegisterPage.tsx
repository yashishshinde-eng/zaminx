import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "@zaminex/shared";
import type { RegisterBody } from "@zaminex/shared";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/layout/Logo";
import { useAuth } from "@/context/AuthContext";

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  // Auto-capture the ?ref=<code> share link (generated on the dashboard) so
  // referrals register under the right sponsor without pasting the code.
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref") ?? "";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterBody>({
    // Shared request schemas are wrapped as { body, ... } for the server's
    // validate middleware; the form holds flat body values, so validate .body.
    resolver: zodResolver(registerSchema.shape.body),
    defaultValues: { referralCode: refCode || undefined },
  });

  const onSubmit = async (values: RegisterBody) => {
    setSubmitting(true);
    try {
      const user = await registerUser(values);
      toast.success(`Account created — welcome, ${user.name}`);
      navigate("/app", { replace: true });
    } catch {
      // Toast handled by the axios interceptor.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel — brand imagery */}
      <div className="hidden lg:flex lg:w-1/2 brand-gradient relative items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_80%_0%,rgba(255,255,255,0.22),transparent_55%)]" />
        <div className="relative z-10 max-w-md text-center text-primary-foreground">
          <Logo className="mx-auto size-16 shadow-glow-gold" />
          <h1 className="mt-6 text-3xl font-bold tracking-tight">Join Zaminex</h1>
          <p className="mt-3 text-lg text-primary-foreground/80">
            Start your investment journey today. Grow with a community of forward-thinking investors.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center bg-background bg-depth p-4">
        <Card className="w-full max-w-md border-0 shadow-card">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto lg:hidden">
              <Logo className="size-12 shadow-glow-gold" />
            </div>
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription>Join the Zaminex investment platform</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" autoComplete="name" placeholder="Jane Doe" {...register("name")} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" {...register("password")} />
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="referralCode">Referral code (optional)</Label>
                <Input id="referralCode" placeholder="ZAM…" {...register("referralCode")} />
                {errors.referralCode && <p className="text-sm text-destructive">{errors.referralCode.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Creating account…" : "Create account"}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}