import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "@zeminex/shared";
import type { RegisterBody } from "@zeminex/shared";
import type { PublicUser } from "@zeminex/shared";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
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
  { code: "+93", flag: "🇦🇫", name: "Afghanistan" },
  { code: "+355", flag: "🇦🇱", name: "Albania" },
  { code: "+213", flag: "🇩🇿", name: "Algeria" },
  { code: "+1684", flag: "🇦🇸", name: "American Samoa" },
  { code: "+376", flag: "🇦🇩", name: "Andorra" },
  { code: "+244", flag: "🇦🇴", name: "Angola" },
  { code: "+1264", flag: "🇦🇮", name: "Anguilla" },
  { code: "+1268", flag: "🇦🇬", name: "Antigua and Barbuda" },
  { code: "+54", flag: "🇦🇷", name: "Argentina" },
  { code: "+374", flag: "🇦🇲", name: "Armenia" },
  { code: "+297", flag: "🇦🇼", name: "Aruba" },
  { code: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "+43", flag: "🇦🇹", name: "Austria" },
  { code: "+994", flag: "🇦🇿", name: "Azerbaijan" },
  { code: "+1242", flag: "🇧🇸", name: "Bahamas" },
  { code: "+973", flag: "🇧🇭", name: "Bahrain" },
  { code: "+880", flag: "🇧🇩", name: "Bangladesh" },
  { code: "+1246", flag: "🇧🇧", name: "Barbados" },
  { code: "+375", flag: "🇧🇾", name: "Belarus" },
  { code: "+32", flag: "🇧🇪", name: "Belgium" },
  { code: "+501", flag: "🇧🇿", name: "Belize" },
  { code: "+229", flag: "🇧🇯", name: "Benin" },
  { code: "+1441", flag: "🇧🇲", name: "Bermuda" },
  { code: "+975", flag: "🇧🇹", name: "Bhutan" },
  { code: "+591", flag: "🇧🇴", name: "Bolivia" },
  { code: "+387", flag: "🇧🇦", name: "Bosnia and Herzegovina" },
  { code: "+267", flag: "🇧🇼", name: "Botswana" },
  { code: "+55", flag: "🇧🇷", name: "Brazil" },
  { code: "+246", flag: "🇮🇴", name: "British Indian Ocean Territory" },
  { code: "+673", flag: "🇧🇳", name: "Brunei" },
  { code: "+359", flag: "🇧🇬", name: "Bulgaria" },
  { code: "+226", flag: "🇧🇫", name: "Burkina Faso" },
  { code: "+257", flag: "🇧🇮", name: "Burundi" },
  { code: "+238", flag: "🇨🇻", name: "Cabo Verde" },
  { code: "+855", flag: "🇰🇭", name: "Cambodia" },
  { code: "+237", flag: "🇨🇲", name: "Cameroon" },
  { code: "+1", flag: "🇨🇦", name: "Canada" },
  { code: "+236", flag: "🇨🇫", name: "Central African Republic" },
  { code: "+235", flag: "🇹🇩", name: "Chad" },
  { code: "+56", flag: "🇨🇱", name: "Chile" },
  { code: "+86", flag: "🇨🇳", name: "China" },
  { code: "+61", flag: "🇨🇽", name: "Christmas Island" },
  { code: "+61", flag: "🇨🇨", name: "Cocos (Keeling) Islands" },
  { code: "+57", flag: "🇨🇴", name: "Colombia" },
  { code: "+269", flag: "🇰🇲", name: "Comoros" },
  { code: "+242", flag: "🇨🇬", name: "Congo (Republic)" },
  { code: "+243", flag: "🇨🇩", name: "Congo (DRC)" },
  { code: "+682", flag: "🇨🇰", name: "Cook Islands" },
  { code: "+506", flag: "🇨🇷", name: "Costa Rica" },
  { code: "+225", flag: "🇨🇮", name: "Côte d'Ivoire" },
  { code: "+385", flag: "🇭🇷", name: "Croatia" },
  { code: "+53", flag: "🇨🇺", name: "Cuba" },
  { code: "+599", flag: "🇨🇼", name: "Curaçao" },
  { code: "+357", flag: "🇨🇾", name: "Cyprus" },
  { code: "+420", flag: "🇨🇿", name: "Czechia" },
  { code: "+45", flag: "🇩🇰", name: "Denmark" },
  { code: "+253", flag: "🇩🇯", name: "Djibouti" },
  { code: "+1767", flag: "🇩🇲", name: "Dominica" },
  { code: "+1809", flag: "🇩🇴", name: "Dominican Republic" },
  { code: "+593", flag: "🇪🇨", name: "Ecuador" },
  { code: "+20", flag: "🇪🇬", name: "Egypt" },
  { code: "+503", flag: "🇸🇻", name: "El Salvador" },
  { code: "+240", flag: "🇬🇶", name: "Equatorial Guinea" },
  { code: "+291", flag: "🇪🇷", name: "Eritrea" },
  { code: "+372", flag: "🇪🇪", name: "Estonia" },
  { code: "+268", flag: "🇸🇿", name: "Eswatini" },
  { code: "+251", flag: "🇪🇹", name: "Ethiopia" },
  { code: "+500", flag: "🇫🇰", name: "Falkland Islands" },
  { code: "+298", flag: "🇫🇴", name: "Faroe Islands" },
  { code: "+679", flag: "🇫🇯", name: "Fiji" },
  { code: "+358", flag: "🇫🇮", name: "Finland" },
  { code: "+33", flag: "🇫🇷", name: "France" },
  { code: "+594", flag: "🇬🇫", name: "French Guiana" },
  { code: "+689", flag: "🇵🇫", name: "French Polynesia" },
  { code: "+241", flag: "🇬🇦", name: "Gabon" },
  { code: "+220", flag: "🇬🇲", name: "Gambia" },
  { code: "+995", flag: "🇬🇪", name: "Georgia" },
  { code: "+49", flag: "🇩🇪", name: "Germany" },
  { code: "+233", flag: "🇬🇭", name: "Ghana" },
  { code: "+350", flag: "🇬🇮", name: "Gibraltar" },
  { code: "+30", flag: "🇬🇷", name: "Greece" },
  { code: "+299", flag: "🇬🇱", name: "Greenland" },
  { code: "+1473", flag: "🇬🇩", name: "Grenada" },
  { code: "+590", flag: "🇬🇵", name: "Guadeloupe" },
  { code: "+1671", flag: "🇬🇺", name: "Guam" },
  { code: "+502", flag: "🇬🇹", name: "Guatemala" },
  { code: "+44", flag: "🇬🇬", name: "Guernsey" },
  { code: "+224", flag: "🇬🇳", name: "Guinea" },
  { code: "+245", flag: "🇬🇼", name: "Guinea-Bissau" },
  { code: "+592", flag: "🇬🇾", name: "Guyana" },
  { code: "+509", flag: "🇭🇹", name: "Haiti" },
  { code: "+504", flag: "🇭🇳", name: "Honduras" },
  { code: "+852", flag: "🇭🇰", name: "Hong Kong" },
  { code: "+36", flag: "🇭🇺", name: "Hungary" },
  { code: "+354", flag: "🇮🇸", name: "Iceland" },
  { code: "+91", flag: "🇮🇳", name: "India" },
  { code: "+62", flag: "🇮🇩", name: "Indonesia" },
  { code: "+98", flag: "🇮🇷", name: "Iran" },
  { code: "+964", flag: "🇮🇶", name: "Iraq" },
  { code: "+353", flag: "🇮🇪", name: "Ireland" },
  { code: "+44", flag: "🇮🇲", name: "Isle of Man" },
  { code: "+972", flag: "🇮🇱", name: "Israel" },
  { code: "+39", flag: "🇮🇹", name: "Italy" },
  { code: "+1876", flag: "🇯🇲", name: "Jamaica" },
  { code: "+81", flag: "🇯🇵", name: "Japan" },
  { code: "+44", flag: "🇯🇪", name: "Jersey" },
  { code: "+962", flag: "🇯🇴", name: "Jordan" },
  { code: "+7", flag: "🇰🇿", name: "Kazakhstan" },
  { code: "+254", flag: "🇰🇪", name: "Kenya" },
  { code: "+686", flag: "🇰🇮", name: "Kiribati" },
  { code: "+850", flag: "🇰🇵", name: "North Korea" },
  { code: "+82", flag: "🇰🇷", name: "South Korea" },
  { code: "+383", flag: "🇽🇰", name: "Kosovo" },
  { code: "+965", flag: "🇰🇼", name: "Kuwait" },
  { code: "+996", flag: "🇰🇬", name: "Kyrgyzstan" },
  { code: "+856", flag: "🇱🇦", name: "Laos" },
  { code: "+371", flag: "🇱🇻", name: "Latvia" },
  { code: "+961", flag: "🇱🇧", name: "Lebanon" },
  { code: "+266", flag: "🇱🇸", name: "Lesotho" },
  { code: "+231", flag: "🇱🇷", name: "Liberia" },
  { code: "+218", flag: "🇱🇾", name: "Libya" },
  { code: "+423", flag: "🇱🇮", name: "Liechtenstein" },
  { code: "+370", flag: "🇱🇹", name: "Lithuania" },
  { code: "+352", flag: "🇱🇺", name: "Luxembourg" },
  { code: "+853", flag: "🇲🇴", name: "Macao" },
  { code: "+389", flag: "🇲🇰", name: "North Macedonia" },
  { code: "+261", flag: "🇲🇬", name: "Madagascar" },
  { code: "+265", flag: "🇲🇼", name: "Malawi" },
  { code: "+60", flag: "🇲🇾", name: "Malaysia" },
  { code: "+960", flag: "🇲🇻", name: "Maldives" },
  { code: "+223", flag: "🇲🇱", name: "Mali" },
  { code: "+356", flag: "🇲🇹", name: "Malta" },
  { code: "+692", flag: "🇲🇭", name: "Marshall Islands" },
  { code: "+596", flag: "🇲🇶", name: "Martinique" },
  { code: "+222", flag: "🇲🇷", name: "Mauritania" },
  { code: "+230", flag: "🇲🇺", name: "Mauritius" },
  { code: "+262", flag: "🇾🇹", name: "Mayotte" },
  { code: "+52", flag: "🇲🇽", name: "Mexico" },
  { code: "+691", flag: "🇫🇲", name: "Micronesia" },
  { code: "+373", flag: "🇲🇩", name: "Moldova" },
  { code: "+377", flag: "🇲🇨", name: "Monaco" },
  { code: "+976", flag: "🇲🇳", name: "Mongolia" },
  { code: "+382", flag: "🇲🇪", name: "Montenegro" },
  { code: "+1664", flag: "🇲🇸", name: "Montserrat" },
  { code: "+212", flag: "🇲🇦", name: "Morocco" },
  { code: "+258", flag: "🇲🇿", name: "Mozambique" },
  { code: "+95", flag: "🇲🇲", name: "Myanmar" },
  { code: "+264", flag: "🇳🇦", name: "Namibia" },
  { code: "+674", flag: "🇳🇷", name: "Nauru" },
  { code: "+977", flag: "🇳🇵", name: "Nepal" },
  { code: "+31", flag: "🇳🇱", name: "Netherlands" },
  { code: "+687", flag: "🇳🇨", name: "New Caledonia" },
  { code: "+64", flag: "🇳🇿", name: "New Zealand" },
  { code: "+505", flag: "🇳🇮", name: "Nicaragua" },
  { code: "+227", flag: "🇳🇪", name: "Niger" },
  { code: "+234", flag: "🇳🇬", name: "Nigeria" },
  { code: "+683", flag: "🇳🇺", name: "Niue" },
  { code: "+672", flag: "🇳🇫", name: "Norfolk Island" },
  { code: "+1670", flag: "🇲🇵", name: "Northern Mariana Islands" },
  { code: "+47", flag: "🇳🇴", name: "Norway" },
  { code: "+968", flag: "🇴🇲", name: "Oman" },
  { code: "+92", flag: "🇵🇰", name: "Pakistan" },
  { code: "+680", flag: "🇵🇼", name: "Palau" },
  { code: "+970", flag: "🇵🇸", name: "Palestine" },
  { code: "+507", flag: "🇵🇦", name: "Panama" },
  { code: "+675", flag: "🇵🇬", name: "Papua New Guinea" },
  { code: "+595", flag: "🇵🇾", name: "Paraguay" },
  { code: "+51", flag: "🇵🇪", name: "Peru" },
  { code: "+63", flag: "🇵🇭", name: "Philippines" },
  { code: "+48", flag: "🇵🇱", name: "Poland" },
  { code: "+351", flag: "🇵🇹", name: "Portugal" },
  { code: "+1787", flag: "🇵🇷", name: "Puerto Rico" },
  { code: "+974", flag: "🇶🇦", name: "Qatar" },
  { code: "+262", flag: "🇷🇪", name: "Réunion" },
  { code: "+40", flag: "🇷🇴", name: "Romania" },
  { code: "+7", flag: "🇷🇺", name: "Russia" },
  { code: "+250", flag: "🇷🇼", name: "Rwanda" },
  { code: "+590", flag: "🇧🇱", name: "Saint Barthélemy" },
  { code: "+1869", flag: "🇰🇳", name: "Saint Kitts and Nevis" },
  { code: "+1758", flag: "🇱🇨", name: "Saint Lucia" },
  { code: "+590", flag: "🇲🇫", name: "Saint Martin" },
  { code: "+508", flag: "🇵🇲", name: "Saint Pierre and Miquelon" },
  { code: "+1784", flag: "🇻🇨", name: "Saint Vincent and the Grenadines" },
  { code: "+685", flag: "🇼🇸", name: "Samoa" },
  { code: "+378", flag: "🇸🇲", name: "San Marino" },
  { code: "+239", flag: "🇸🇹", name: "Sao Tome and Principe" },
  { code: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
  { code: "+221", flag: "🇸🇳", name: "Senegal" },
  { code: "+381", flag: "🇷🇸", name: "Serbia" },
  { code: "+248", flag: "🇸🇨", name: "Seychelles" },
  { code: "+232", flag: "🇸🇱", name: "Sierra Leone" },
  { code: "+65", flag: "🇸🇬", name: "Singapore" },
  { code: "+1721", flag: "🇸🇽", name: "Sint Maarten" },
  { code: "+421", flag: "🇸🇰", name: "Slovakia" },
  { code: "+386", flag: "🇸🇮", name: "Slovenia" },
  { code: "+677", flag: "🇸🇧", name: "Solomon Islands" },
  { code: "+252", flag: "🇸🇴", name: "Somalia" },
  { code: "+27", flag: "🇿🇦", name: "South Africa" },
  { code: "+211", flag: "🇸🇸", name: "South Sudan" },
  { code: "+34", flag: "🇪🇸", name: "Spain" },
  { code: "+94", flag: "🇱🇰", name: "Sri Lanka" },
  { code: "+249", flag: "🇸🇩", name: "Sudan" },
  { code: "+597", flag: "🇸🇷", name: "Suriname" },
  { code: "+46", flag: "🇸🇪", name: "Sweden" },
  { code: "+41", flag: "🇨🇭", name: "Switzerland" },
  { code: "+963", flag: "🇸🇾", name: "Syria" },
  { code: "+886", flag: "🇹🇼", name: "Taiwan" },
  { code: "+992", flag: "🇹🇯", name: "Tajikistan" },
  { code: "+255", flag: "🇹🇿", name: "Tanzania" },
  { code: "+66", flag: "🇹🇭", name: "Thailand" },
  { code: "+670", flag: "🇹🇱", name: "Timor-Leste" },
  { code: "+228", flag: "🇹🇬", name: "Togo" },
  { code: "+690", flag: "🇹🇰", name: "Tokelau" },
  { code: "+676", flag: "🇹🇴", name: "Tonga" },
  { code: "+1868", flag: "🇹🇹", name: "Trinidad and Tobago" },
  { code: "+216", flag: "🇹🇳", name: "Tunisia" },
  { code: "+90", flag: "🇹🇷", name: "Turkey" },
  { code: "+993", flag: "🇹🇲", name: "Turkmenistan" },
  { code: "+1649", flag: "🇹🇨", name: "Turks and Caicos Islands" },
  { code: "+688", flag: "🇹🇻", name: "Tuvalu" },
  { code: "+256", flag: "🇺🇬", name: "Uganda" },
  { code: "+380", flag: "🇺🇦", name: "Ukraine" },
  { code: "+971", flag: "🇦🇪", name: "United Arab Emirates" },
  { code: "+44", flag: "🇬🇧", name: "United Kingdom" },
  { code: "+1", flag: "🇺🇸", name: "United States" },
  { code: "+598", flag: "🇺🇾", name: "Uruguay" },
  { code: "+998", flag: "🇺🇿", name: "Uzbekistan" },
  { code: "+678", flag: "🇻🇺", name: "Vanuatu" },
  { code: "+379", flag: "🇻🇦", name: "Vatican City" },
  { code: "+58", flag: "🇻🇪", name: "Venezuela" },
  { code: "+84", flag: "🇻🇳", name: "Vietnam" },
  { code: "+1284", flag: "🇻🇬", name: "Virgin Islands (British)" },
  { code: "+1340", flag: "🇻🇮", name: "Virgin Islands (US)" },
  { code: "+681", flag: "🇼🇫", name: "Wallis and Futuna" },
  { code: "+212", flag: "🇪🇭", name: "Western Sahara" },
  { code: "+967", flag: "🇾🇪", name: "Yemen" },
  { code: "+260", flag: "🇿🇲", name: "Zambia" },
  { code: "+263", flag: "🇿🇼", name: "Zimbabwe" },
];

export function RegisterPage() {
  const { t } = useTranslation();
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
      toast.success(t("register.accountCreated"));
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
      toast.error(t("register.copyFailed"));
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
          <h1 className="font-grotesk mt-6 text-3xl font-bold tracking-tight">{t("register.heroTitle")}</h1>
          <p className="mt-3 text-lg text-primary-foreground/80">
            {t("register.heroSubtitle")}
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { icon: Wallet, label: t("register.featureWallet") },
              { icon: TrendingUp, label: t("register.featureAnalytics") },
              { icon: ShieldCheck, label: t("register.featureSecurity") },
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
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo className="size-12 shadow-glow-blue" />
          </div>

          <div className="glass-card p-6 sm:p-8">
            <div className="mb-6 text-center">
              <h2 className="font-grotesk text-2xl font-bold tracking-tight">{t("register.title")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("register.subtitle")}</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="name">{t("register.fullName")}</Label>
                <Input id="name" autoComplete="name" placeholder="Jane Doe" {...register("name")} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("register.email")}</Label>
                <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t("register.mobileNumber")}</Label>
                <div className="flex gap-2">
                  <select
                    id="countryCode"
                    aria-label={t("register.countryCode")}
                    className="glass-input h-11 w-[9.5rem] shrink-0 truncate rounded-md px-2 text-sm text-foreground focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
                    {...register("countryCode")}
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={`${c.code}-${c.name}`} value={c.code}>
                        {c.flag} {c.code} {c.name}
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
                <Label htmlFor="password">{t("register.password")}</Label>
                <PasswordInput id="password" autoComplete="new-password" placeholder="At least 8 characters" {...register("password")} />
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="transactionPassword">{t("register.transactionPin")}</Label>
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
                <p className="text-xs text-muted-foreground">{t("register.transactionPinHint")}</p>
                {errors.transactionPassword && <p className="text-sm text-destructive">{errors.transactionPassword.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="referralCode">{t("register.referralCode")}</Label>
                <Input id="referralCode" placeholder="ZAM…" autoComplete="off" {...register("referralCode")} />
                {errors.referralCode ? (
                  <p className="text-sm text-destructive">{errors.referralCode.message}</p>
                ) : codeCheck.status === "valid" ? (
                  <p className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-500">
                    <Check className="size-3.5" />
                    {t("register.referralCodeValid")}
                  </p>
                ) : codeCheck.status === "invalid" ? (
                  <p className="flex items-center gap-1.5 text-sm text-destructive">
                    <X className="size-3.5" />
                    {t("register.referralCodeInvalid")}
                  </p>
                ) : codeCheck.status === "checking" ? (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    {t("register.referralCodeChecking")}
                  </p>
                ) : null}
              </div>
              <Button type="submit" className="btn-premium w-full h-11" disabled={submitting}>
                {submitting ? t("register.creatingAccount") : <>{t("register.createAccount")} <ArrowRight className="size-4" /></>}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              {t("register.haveAccount")}{" "}
              <Link to="/login" className="font-medium text-gold hover:underline">
                {t("register.signIn")}
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
            {t("register.successTitle")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("register.successSubtitle")}
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {/* Email / Login ID */}
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("register.loginId")}</p>
                <p className="mt-1 truncate text-sm font-semibold">{registeredUser?.email}</p>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(registeredUser?.email ?? "", "email")}
                className="ml-2 shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label={t("register.copyEmail")}
              >
                {copiedField === "email" ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
              </button>
            </div>
          </div>

          {/* Password */}
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("register.password")}</p>
                <p className="mt-1 truncate text-sm font-semibold font-mono">{registeredPassword}</p>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(registeredPassword, "password")}
                className="ml-2 shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label={t("register.copyPassword")}
              >
                {copiedField === "password" ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
              </button>
            </div>
          </div>

          {/* Transaction PIN */}
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("register.transactionPin")}</p>
                <p className="mt-1 truncate text-sm font-semibold font-mono tracking-[0.3em]">{registeredTransactionPin}</p>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(registeredTransactionPin, "txPin")}
                className="ml-2 shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label={t("register.copyTransactionPin")}
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
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("register.yourReferralCode")}</p>
                  <p className="mt-1 truncate text-sm font-semibold">{registeredUser.referralCode}</p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(registeredUser.referralCode ?? "", "referral")}
                  className="ml-2 shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label={t("register.copyReferralCode")}
                >
                  {copiedField === "referral" ? <Check className="size-4 text-green-500" /> : <Copy className="size-4" />}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-600 dark:text-amber-400">
          ⚠️ {t("register.saveCredentialsWarning")}
        </div>

        <Button type="button" className="btn-premium mt-5 w-full h-11" onClick={handleGoToLogin}>
          {t("register.continueToSignIn")} <ArrowRight className="ml-2 size-4" />
        </Button>
      </Dialog>
    </div>
  );
}