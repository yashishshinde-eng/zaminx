import { useState } from "react";
import { RefreshCw, FileText } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminLogs } from "@/hooks/useAdmin";
import type { AdminLogFile, AdminLogsQuery } from "@zaminex/shared";

const FILES: AdminLogFile[] = ["combined", "error", "exceptions", "rejections"];

/** /app/admin/logs — tail a Winston log file (Phase 14C). */
export function AdminLogsPage() {
  const [file, setFile] = useState<AdminLogFile>("combined");
  const [linesInput, setLinesInput] = useState(200);
  const [applied, setApplied] = useState<AdminLogsQuery>({ file: "combined", lines: 200 });

  const { data, isLoading, isError, refetch } = useAdminLogs(applied);

  function apply() {
    const n = Math.min(500, Math.max(1, Number(linesInput) || 200));
    setLinesInput(n);
    setApplied({ file, lines: n });
  }

  return (
    <AppShell>
      <PageHeader
        title="Application Logs"
        description="Tail the server's Winston log files. File logging is active in production only."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Dashboard", to: "/app" }, { label: "Admin", to: "/app/admin" }, { label: "Logs" }]}
      />

      <div className="mt-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-1">
              <Label htmlFor="logFile" className="text-xs text-muted-foreground">File</Label>
              <select
                id="logFile"
                value={file}
                onChange={(e) => setFile(e.target.value as AdminLogFile)}
                className="h-9 w-[180px] rounded-md border border-input bg-background px-3 text-sm"
              >
                {FILES.map((f) => (
                  <option key={f} value={f}>{f}.log</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="logLines" className="text-xs text-muted-foreground">Lines (tail)</Label>
              <Input
                id="logLines"
                type="number"
                min={1}
                max={500}
                value={linesInput}
                onChange={(e) => setLinesInput(Number(e.target.value))}
                className="h-9 w-[150px]"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={apply}>Apply</Button>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                <RefreshCw className="size-4" /> Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Output */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4 text-primary" /> {applied.file}.log
            </CardTitle>
            <CardDescription>
              {data && data.exists ? `Last ${data.lines.length} line${data.lines.length === 1 ? "" : "s"}${data.truncated ? " (truncated)" : ""}` : "File not found"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : isError ? (
              <p className="text-sm text-destructive">Couldn't read logs. Please try again.</p>
            ) : !data?.exists ? (
              <p className="text-sm text-muted-foreground">
                No log file found. The file transport is active in production only — in development logs go to the console.
              </p>
            ) : data.lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">The file is empty.</p>
            ) : (
              <pre className="max-h-[60vh] overflow-auto rounded-lg border bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-300">
                {data.lines.join("\n")}
              </pre>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

export default AdminLogsPage;