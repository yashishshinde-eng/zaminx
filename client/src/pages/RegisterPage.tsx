import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "@zeminex/shared";
import type { RegisterBody } from "@zeminex/shared";
import type { PublicUser } from "@zeminex/shared";
import toast from "react-hot-toast";
import { ArrowRight, ShieldCheck, Wallet, TrendingUp, Copy, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/layout/Logo";
import { Dialog } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { checkReferralCode } from "@/lib/referrals";
import { sanitizePinEvent } from "@/lib/pin";

/** Dialling codes offered in the registration country-code dropdown. */
const COUNTRY_CODES = [
  { code: "+91", flag: "🇮🇳" },
  { code: "+1", flag: "🇺🇸" },
  { code: "+44", flag: "🇬🇧" },
  { code: "+971", flag: "🇦🇪" },
  { code: "+61", flag: "🇦🇺" },
  { code: "+65", flag: "🇸🇬" },
  { code: "+92", flag: "🇵🇰" },
  { code: "+880", flag: "🇧🇩" },
  { code: "+94", flag: "🇱🇰" },
  { code: "+977", flag: "🇳🇵" },
  { code: "+966", flag: "🇸🇦" },
  { code: "+968", flag: "🇴🇲" },
  { code: "+974", flag: "🇶🇦" },
  { code: "+973", flag: "🇧🇭" },
  { code: "+965", flag: "🇰🇼" },
  { code: "+62", flag: "🇮🇩" },
  { code: "+60", flag: "🇲🇾" },
  { code: "+63", flag: "🇵🇭" },
  { code: "+66", flag: "🇹🇭" },
  { code: "+27", flag: "🇿🇦" },
  { code: "+234", flag: "🇳🇬" },
  { code: "+254", flag: "🇰🇪" },
  { code: "+49", flag: "🇩🇪" },
  { code: "+33", flag: "🇫🇷" },
  { code: "+34", flag: "🇪🇸" },
  { code: "+39", flag: "🇮🇹" },
  { code: "+31", flag: "🇳🇱" },
  { code: "+7", flag: "🇷🇺" },
  { code: "+86", flag: "🇨🇳" },
  { code: "+81", flag: "🇯🇵" },
  { code: "+82", flag: "🇰🇷" },
];

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<PublicUser | null>(null);
  const [registeredPassword, setRegisteredPassword] = useState("");
  const [registeredTransactionPin, setRegisteredTransactionPin] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Auto-capture the ?ref=<code> share link (generated on the dashboard) so
  // referrals register under the right sponsor without pasting the code.
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref") ?? "";

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterBody>({
    resolver: zodResolver(registerSchema.shape.body),
    defaultValues: { referralCode: refCode || undefined, countryCode: "+91" },
  });

  // Live referral-code validation — debounced, works for both link-prefilled and
  // manually-entered codes. Shows a small "verified" / "invalid" affordance under
  // the field before submit. Stale responses are ignored via reqIdRef.
  const watchedCode = watch("referralCode");
  const [codeCheck, setCodeCheck] = useState<{ status: "idle" | "checking" | "valid" | "invalid"; name?: string }>(
    { status: "idle" },
  );
  const reqIdRef = useRef(0);

  useEffect(() => {
    const code = (watchedCode ?? "").trim();
    if (!code) {
      reqIdRef.current += 1;
      setCodeCheck({ status: "idle" });
      return;
    }
    const id = ++reqIdRef.current;
    setCodeCheck({ status: "checking" });
    const t = setTimeout(async () => {
      try {
        const res = await checkReferralCode(code);
        if (id !== reqIdRef.current) return; // a newer keystroke superseded this
        setCodeCheck({ status: res.valid ? "valid" : "invalid", name: res.name });
      } catch {
        if (id !== reqIdRef.current) return;
        // Network/429 — don't claim invalid; let the backend re-check on submit.
        setCodeCheck({ status: "idle" });
      }
    }, 450);
    return () => clearTimeout(t);
  }, [watchedCode]);

  const onSubmit = async (values: RegisterBody) => {
    setSubmitting(true);
    try {
      const user = await registerUser(values);
      setRegisteredUser(user);
      setRegisteredPassword(values.password);
      setRegisteredTransactionPin(values.transactionPassword);
      toast.success("Account created successfully!");
    } catch {
      // Toast handled by the axios interceptor.
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleGoToLogin = () => {
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen">
      {/* ── Left panel — brand imagery ────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 gradient-blue relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_80%_0%,rgba(255,255,255,0.22),transparent_55%)]" />
        <div className="glow-orb left-[10%] top-[20%] size-[300px] bg-white/10" />
        <div className="glow-orb right-[15%] bottom-[15%] size-[200px] bg-white/5" />

        <div className="relative z-10 max-w-md text-center text-primary-foreground">
          <Logo className="mx-auto size-16 shadow-glow-blue" />
          <h1 className="font-grotesk mt-6 text-3xl font-bold tracking-tight">Join Zeminex Global</h1>
          <p className="mt-3 text-lg text-primary-foreground/80">
            Start your investment journey today. Grow with a community of forward-thinking investors.
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

          <div className="glass-card p-6 sm:p-8">
            <div className="mb-6 text-center">
              <h2 className="font-grotesk text-2xl font-bold tracking-tight">Create your account</h2>
              <p className="mt-1 text-sm text-muted-foreground">Join Zeminex Global Now!</p>
            </div>

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
                <Label htmlFor="phone">Mobile number</Label>
                <div className="flex gap-2">
                  <select
                    id="countryCode"
                    aria-label="Country code"
                    className="glass-input h-11 shrink-0 rounded-md px-2 text-sm text-foreground focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
                    {...register("countryCode")}
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} {c.flag}
                      </option>
                    ))}
                  </select>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="555 123 4567"
                    className="flex-1"
                    {...register("phone")}
                  />
                </div>
                {errors.countryCode && <p className="text-sm text-destructive">{errors.countryCode.message}</p>}
                {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <PasswordInput id="password" autoComplete="new-password" placeholder="At least 8 characters" {...register("password")} />
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="transactionPassword">Transaction PIN</Label>
                <PasswordInput
                  id="transactionPassword"
                  autoComplete="off"
                  inputMode="numeric"
                  maxLength={4}
                  pattern="\d*"
                  placeholder="4-digit PIN"
                  className="tracking-[0.5em]"
                  {...register("transactionPassword")}
                  onChange={(e) =>
                    setValue("transactionPassword", sanitizePinEvent(e), { shouldValidate: true })
                  }
                />
                <p className="text-xs text-muted-foreground">4-digit PIN used to authorise withdrawals and transfers.</p>
                {errors.transactionPassword && <p className="text-sm text-destructive">{errors.transactionPassword.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="referralCode">Referral code</Label>
                <Input id="referralCode" placeholder="ZAM…" autoComplete="off" {...register("referralCode")} />
                {errors.referralCode ? (
                  <p className="text-sm text-destructive">{errors.referralCode.message}</p>
                ) : codeCheck.status === "valid" ? (
                  <p className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-500">
                    <Check className="size-3.5" />
                    Valid referral code
                  </p>
                ) : codeCheck.status === "invalid" ? (
                  <p className="flex items-center gap-1.5 text-sm text-destructive">
                    <X className="size-3.5" />
                    Invalid referral code
                  </p>
                ) : codeCheck.status === "checking" ? (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    Checking…
                  </p>
                ) : null}
              </div>
              <Button type="submit" className="btn-premium w-full h-11" disabled={submitting}>
                {submitting ? "Creating account…" : <>Create account <ArrowRight className="size-4" /></>}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-gold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* ── Credentials popup after successful registration ────── */}
      <Dialog
        open={!!registeredUser}
        onClose={handleGoToLogin}
        labelledBy="credentials-title"
        className="max-w-md"
        neonVariant="green"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-green-500/10">
            <Check className="size-7 text-green-500" />
          </div>
          <h2 id="credentials-title" className="font-grotesk text-xl font-bold tracking-tight">
            Account Created Successfully!
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Save your login credentials. You&apos;ll need them to sign in.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {/* Email / Login ID */}
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Login ID (Email)</p>
                <p className="mt-1 truncate text-sm font-semibold">{registeredUser?.email}</p>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(registeredUser?.email ?? "", "email")}
                className="ml-2 shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Copy email"
              >
                {copiedField === "email" ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
              </button>
            </div>
          </div>

          {/* Password */}
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Password</p>
                <p className="mt-1 truncate text-sm font-semibold font-mono">{registeredPassword}</p>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(registeredPassword, "password")}
                className="ml-2 shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Copy password"
              >
                {copiedField === "password" ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
              </button>
            </div>
          </div>

          {/* Transaction PIN */}
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Transaction PIN</p>
                <p className="mt-1 truncate text-sm font-semibold font-mono tracking-[0.3em]">{registeredTransactionPin}</p>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(registeredTransactionPin, "txPin")}
                className="ml-2 shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Copy transaction PIN"
              >
                {copiedField === "txPin" ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
              </button>
            </div>
          </div>

          {/* Referral Code (their own) */}
          {registeredUser?.referralCode && (
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Your Referral Code</p>
                  <p className="mt-1 truncate text-sm font-semibold">{registeredUser.referralCode}</p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(registeredUser.referralCode ?? "", "referral")}
                  className="ml-2 shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="Copy referral code"
                >
                  {copiedField === "referral" ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-600 dark:text-amber-400">
          ⚠️ Please save your credentials before continuing. You&apos;ll need your email + password to sign in, and your Transaction PIN to authorise withdrawals and transfers.
        </div>

        <Button type="button" className="btn-premium mt-5 w-full h-11" onClick={handleGoToLogin}>
          Continue to Sign In <ArrowRight className="ml-2 size-4" />
        </Button>
      </Dialog>
    </div>
  );
}