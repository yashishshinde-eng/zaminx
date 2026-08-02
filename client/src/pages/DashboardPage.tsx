import { Link } from "react-router-dom";
import { Construction } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";

const PHASES = [
  { title: "Wallet System", desc: "Main, bonus & trading wallets with an immutable ledger.", phase: "Phase 8" },
  { title: "Deposits", desc: "NOWPayments integration with webhook verification.", phase: "Phase 7" },
  { title: "Compensation Engine", desc: "Trading yield, direct, team, community, rank & bonanza.", phase: "Phase 10" },
  { title: "Withdrawals", desc: "Manual admin approval with on-hold balance logic.", phase: "Phase 8A" },
];

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        description="Your investment overview — widgets arrive in the next phases."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Dashboard" }]}
      />

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Signed in as {user?.name}</CardTitle>
              <CardDescription>{user?.email}</CardDescription>
            </div>
            <Badge variant="secondary">{user?.role}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your referral code is <span className="font-mono font-semibold text-foreground">{user?.referralCode}</span>.
            Share it to start building your team.
          </p>
        </CardContent>
      </Card>

      <div className="mt-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Construction className="size-4" />
          <span className="text-sm font-medium">Coming in the next phases</span>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PHASES.map((p) => (
            <Card key={p.title}>
              <CardHeader>
                <Badge variant="outline" className="w-fit">
                  {p.phase}
                </Badge>
                <CardTitle className="mt-2 text-base">{p.title}</CardTitle>
                <CardDescription>{p.desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        <Link to="/app/settings" className="text-primary hover:underline">
          Go to Settings →
        </Link>
      </p>
    </AppShell>
  );
}