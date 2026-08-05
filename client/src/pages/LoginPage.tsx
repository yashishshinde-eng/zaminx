import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@zaminex/shared";
import type { LoginBody } from "@zaminex/shared";
import toast from "react-hot-toast";
import { ArrowRight, ShieldCheck, Wallet, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/layout/Logo";
import { useAuth } from "@/context/AuthContext";

interface LocationState {
  from?: string;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginBody>({ resolver: zodResolver(loginSchema.shape.body) });

  const onSubmit = async (values: LoginBody) => {
    setSubmitting(true);
    try {
      const user = await login(values.email, values.password);
      toast.success(`Welcome back, ${user.name}`);
      const from = (location.state as LocationState)?.from ?? "/app";
      navigate(from, { replace: true });
    } catch {
      // Toast handled by the axios interceptor.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* ── Left panel — brand imagery ────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 gradient-blue relative items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_80%_0%,rgba(255,255,255,0.22),transparent_55%)]" />
        {/* Floating decorative elements */}
        <div className="glow-orb left-[10%] top-[20%] size-[300px] bg-white/10" />
        <div className="glow-orb right-[15%] bottom-[15%] size-[200px] bg-white/5" />

        <div className="relative z-10 max-w-md text-center text-primary-foreground">
          <Logo className="mx-auto size-16 shadow-glow-blue" />
          <h1 className="font-grotesk mt-6 text-3xl font-bold tracking-tight">Welcome to Zaminex</h1>
          <p className="mt-3 text-lg text-primary-foreground/80">
            Your premium investment platform. Grow your portfolio with confidence.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { icon: Wallet, label: "Multi-Wallet" },
              { icon: TrendingUp, label: "Smart Analytics" },
              { icon: ShieldCheck, label: "Bank-Level Security" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-white/10 p-4 text-center backdrop-blur-sm">
                <item.icon className="mx-auto size-6" />
                <p className="mt-2 text-xs font-medium">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel — form ──────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center bg-background bg-depth p-4">
        <div className="w-full max-w-md">
          {/* Logo for mobile */}
          <div className="mx-auto mb-8 lg:hidden">
            <Logo className="size-12 shadow-glow-blue" />
          </div>

          <div className="glass-card p-8">
            <div className="mb-6 text-center">
              <h2 className="font-grotesk text-2xl font-bold tracking-tight">Welcome back</h2>
              <p className="mt-1 text-sm text-muted-foreground">Sign in to your Zaminex account</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" {...register("password")} />
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>
              <Button type="submit" className="btn-premium w-full h-11" disabled={submitting}>
                {submitting ? "Signing in…" : <>Sign in <ArrowRight className="size-4" /></>}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link to="/register" className="font-medium text-gold hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}