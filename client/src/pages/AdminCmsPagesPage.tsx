import { useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, DataTable, type Column } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmModal } from "@/components/ui/dialog";
import { CmsPageDialog } from "@/components/admin/CmsPageDialog";
import { formatDate } from "@/lib/utils";
import { useAdminPages, useDeletePage } from "@/hooks/useAdminCms";
import type { AdminCmsPageListItem } from "@zaminex/shared";

const STATUSES = ["all", "published", "draft"] as const;
type StatusFilter = (typeof STATUSES)[number];
const LIMIT = 20;

/** /app/admin/cms — admin CRUD for CMS pages (includes drafts). */
export function AdminCmsPagesPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState<{ q: string; status: StatusFilter }>({ q: "", status: "all" });

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AdminCmsPageListItem | null>(null);
  const [deleting, setDeleting] = useState<AdminCmsPageListItem | null>(null);

  const params = {
    q: applied.q || undefined,
    status: applied.status === "all" ? undefined : applied.status,
    page,
    limit: LIMIT,
  };
  const { data, isLoading, isError, refetch } = useAdminPages(params);
  const deleteMut = useDeletePage();

  const pages = data?.items ?? [];
  const pagination = data && { page: data.page, totalPages: data.totalPages };

  function applyFilters() {
    setApplied({ q, status });
    setPage(1);
  }
  function clearFilters() {
    setQ("");
    setStatus("all");
    setApplied({ q: "", status: "all" });
    setPage(1);
  }

  return (
    <AppShell>
      <PageHeader
        title="CMS Pages"
        description="Create, edit, publish, and remove site pages. Content is structured into blocks (no raw HTML) and previewed live."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Dashboard", to: "/app" }, { label: "Admin", to: "/app/admin" }, { label: "CMS Pages" }]}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> New page
          </Button>
        }
      />

      <div className="mt-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                  placeholder="Title or slug"
                  className="h-9 w-[220px] pl-8"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusFilter)}
                className="h-9 w-[150px] rounded-md border border-input bg-background px-3 text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === "all" ? "All statuses" : s}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={applyFilters}>
                Apply
              </Button>
              <Button size="sm" variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        <DataTable
          columns={columns(setEditing, setDeleting)}
          data={pages}
          rowKey={(r) => r.slug}
          isLoading={isLoading}
          error={isError ? "We couldn't load pages. Please try again." : null}
          onRetry={() => refetch()}
          emptyTitle="No pages"
          emptyDescription="Create a page to get started."
          emptyAction={
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-4" /> New page
            </Button>
          }
          page={pagination?.page ?? 1}
          pageCount={pagination?.totalPages ?? 1}
          onPageChange={setPage}
        />
      </div>

      {creating && <CmsPageDialog open={creating} mode="create" onClose={() => setCreating(false)} />}
      {editing && <CmsPageDialog open={editing !== null} mode="edit" slug={editing.slug} onClose={() => setEditing(null)} />}

      <ConfirmModal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) deleteMut.mutate(deleting.slug, { onSettled: () => setDeleting(null) });
        }}
        title="Delete this page?"
        description="The page will be removed permanently. This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleteMut.isPending}
      />
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Columns                                                             */
/* ------------------------------------------------------------------ */

function columns(
  onEdit: (p: AdminCmsPageListItem) => void,
  onDelete: (p: AdminCmsPageListItem) => void,
): Column<AdminCmsPageListItem>[] {
  return [
    { key: "title", header: "Title", cell: (r) => <span className="font-medium">{r.title}</span> },
    { key: "slug", header: "Slug", cell: (r) => <span className="font-mono text-xs">{r.slug}</span> },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <Badge variant={r.status === "published" ? "success" : "secondary"} className="capitalize">
          {r.status}
        </Badge>
      ),
    },
    { key: "publishedAt", header: "Published", cell: (r) => (r.publishedAt ? formatDate(r.publishedAt) : "—") },
    { key: "updatedAt", header: "Updated", cell: (r) => formatDate(r.updatedAt) },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => onEdit(r)}>
            <Pencil className="size-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(r)}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];
}

export default AdminCmsPagesPage;