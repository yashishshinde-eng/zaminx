import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader, DataTable, type Column } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, ConfirmModal } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAdminBonanzas, useCreateBonanza, useUpdateBonanza, useDeleteBonanza } from "@/hooks/useAdminBonanzas";
import type { BonanzaOfferRow, BonanzaStatus, CreateBonanzaBody, UpdateBonanzaBody } from "@zaminex/shared";

const LIMIT = 20;

/** /app/admin/bonanzas — admin CRUD for bonanza offers. */
export function AdminBonanzasPage() {
  const { data, isLoading, isError, refetch } = useAdminBonanzas({ page: 1, limit: LIMIT });
  const offers = data?.items ?? [];
  const pagination = data && { page: data.page, totalPages: data.totalPages };

  const [editing, setEditing] = useState<BonanzaOfferRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<BonanzaOfferRow | null>(null);

  const deleteMut = useDeleteBonanza();

  return (
    <AppShell>
      <PageHeader
        title="Bonanza Offers"
        description="Create, edit, and remove referral-bonanza offers. Active offers appear on every user's Bonanza page within their date window."
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Dashboard", to: "/app" }, { label: "Admin", to: "/app/admin" }, { label: "Bonanzas" }]}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" /> New offer
          </Button>
        }
      />

      <div className="mt-6">
        <DataTable
          columns={columns(setEditing, setDeleting)}
          data={offers}
          rowKey={(r) => r.id}
          isLoading={isLoading}
          error={isError ? "We couldn't load bonanza offers. Please try again." : null}
          onRetry={() => refetch()}
          emptyTitle="No bonanza offers"
          emptyDescription="Create one to start a referral challenge."
          emptyAction={
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-4" /> New offer
            </Button>
          }
          page={pagination?.page ?? 1}
          pageCount={pagination?.totalPages ?? 1}
        />
      </div>

      {(creating || editing) && (
        <BonanzaDialog
          open={creating || editing !== null}
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      <ConfirmModal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) deleteMut.mutate(deleting.id, { onSettled: () => setDeleting(null) });
        }}
        title="Delete this bonanza offer?"
        description="The offer will be removed permanently. Any already-awarded bonuses stay in users' ledgers."
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
  onEdit: (o: BonanzaOfferRow) => void,
  onDelete: (o: BonanzaOfferRow) => void,
): Column<BonanzaOfferRow>[] {
  return [
    { key: "name", header: "Name", cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: "requiredDirects", header: "Required directs", align: "right", cell: (r) => String(r.requiredDirects) },
    { key: "rewardAmount", header: "Reward", align: "right", cell: (r) => formatCurrency(r.rewardAmount) },
    { key: "startDate", header: "Start", cell: (r) => formatDate(r.startDate) },
    { key: "endDate", header: "End", cell: (r) => formatDate(r.endDate) },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <Badge variant={r.status === "active" ? "success" : "secondary"} className="capitalize">
          {r.status}
        </Badge>
      ),
    },
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

/* ------------------------------------------------------------------ */
/*  Create / edit dialog                                                */
/* ------------------------------------------------------------------ */

function BonanzaDialog({ open, initial, onClose }: { open: boolean; initial: BonanzaOfferRow | null; onClose: () => void }) {
  const createMut = useCreateBonanza();
  const updateMut = useUpdateBonanza();

  // datetime-local expects "YYYY-MM-DDTHH:mm" (local). Trim the ISO timezone.
  function toLocalInput(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  const [name, setName] = useState(initial?.name ?? "");
  const [requiredDirects, setRequiredDirects] = useState(initial?.requiredDirects ?? 1);
  const [rewardAmount, setRewardAmount] = useState(initial?.rewardAmount ?? 0);
  const [startDate, setStartDate] = useState(initial ? toLocalInput(initial.startDate) : "");
  const [endDate, setEndDate] = useState(initial ? toLocalInput(initial.endDate) : "");
  const [status, setStatus] = useState<BonanzaStatus>(initial?.status ?? "active");
  const [terms, setTerms] = useState(initial?.terms ?? "");

  const isEdit = initial !== null;
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  const valid =
    name.trim().length > 0 &&
    requiredDirects >= 1 &&
    rewardAmount >= 0 &&
    start !== null &&
    end !== null &&
    end > start;

  async function onSubmit() {
    if (!valid || !start || !end) return;
    try {
      if (isEdit && initial) {
        const body: UpdateBonanzaBody = {
          name: name.trim(),
          requiredDirects,
          rewardAmount,
          startDate: start,
          endDate: end,
          status,
          terms: terms.trim() || undefined,
        };
        await updateMut.mutateAsync({ id: initial.id, body });
      } else {
        const body: CreateBonanzaBody = {
          name: name.trim(),
          requiredDirects,
          rewardAmount,
          startDate: start,
          endDate: end,
          status,
          terms: terms.trim() || undefined,
        };
        await createMut.mutateAsync(body);
      }
      onClose();
    } catch {
      /* interceptor toasts (validation / date order) */
    }
  }

  const pending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onClose={onClose} labelledBy="bonanza-title" className="max-w-xl">
      <h2 id="bonanza-title" className="text-lg font-semibold">
        {isEdit ? "Edit bonanza offer" : "New bonanza offer"}
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="b-name">Name</Label>
          <Input id="b-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="b-directs">Required directs</Label>
          <Input
            id="b-directs"
            type="number"
            min={1}
            value={requiredDirects}
            onChange={(e) => setRequiredDirects(Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="b-reward">Reward amount (USD)</Label>
          <Input
            id="b-reward"
            type="number"
            min={0}
            value={rewardAmount}
            onChange={(e) => setRewardAmount(Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="b-start">Start date</Label>
          <Input id="b-start" type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="b-end">End date</Label>
          <Input id="b-end" type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="b-status">Status</Label>
          <select
            id="b-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as BonanzaStatus)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="b-terms">Terms (optional)</Label>
          <Input id="b-terms" value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Short terms text" />
        </div>
        {start && end && end <= start && (
          <p className="text-sm text-destructive sm:col-span-2">End date must be after start date.</p>
        )}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={pending || !valid}>
          {pending ? "Saving…" : isEdit ? "Save offer" : "Create offer"}
        </Button>
      </div>
    </Dialog>
  );
}

export default AdminBonanzasPage;