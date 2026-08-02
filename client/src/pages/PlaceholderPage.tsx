import { Hammer } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <AppShell>
      <PageHeader title={title} description={description} breadcrumbs={[{ label: "Dashboard", to: "/app" }, { label: title }]} />
      <Card className="mt-6">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Hammer className="size-6" />
          </div>
          <p className="text-base font-semibold">Under construction</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            This module ships in a later phase of the blueprint. The foundation is ready for it.
          </p>
        </CardContent>
      </Card>
    </AppShell>
  );
}