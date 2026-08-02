import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Wallet, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/layout/Logo";
import { useAuth } from "@/context/AuthContext";

const FEATURES = [
  { icon: TrendingUp, title: "Daily Trading Yield", desc: "Earn 1–2% daily from automated arbitrage strategies." },
  { icon: Users, title: "Referral Rewards", desc: "Direct connect bonuses, team energy, and community income." },
  { icon: Wallet, title: "Secure Wallet", desc: "Multi-currency wallet with an immutable financial ledger." },
  { icon: ShieldCheck, title: "Bank-Grade Security", desc: "JWT auth, rate limiting, and audited withdrawals." },
];

export function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo className="size-9" />
            <span className="text-lg font-bold tracking-tight">Zaminex</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link to={isAuthenticated ? "/app" : "/register"}>
                {isAuthenticated ? "Go to dashboard" : "Get started"}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="container flex flex-col items-center gap-6 py-20 text-center sm:py-28">
          <span className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground">
            Phase 1 · Foundation live
          </span>
          <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
            Invest smarter with a <span className="text-primary">modern arbitrage</span> platform
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Secure, scalable, and built for performance. Zaminex combines trading yields, referral rewards,
            and a premium experience — fully responsive, with light & dark themes.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link to="/register">
                Create your account <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </section>

        <section className="container grid gap-6 pb-24 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="size-6" />
                </div>
                <CardTitle className="mt-3">{f.title}</CardTitle>
                <CardDescription>{f.desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Zaminex. Built per the master blueprint.
        </div>
      </footer>
    </div>
  );
}