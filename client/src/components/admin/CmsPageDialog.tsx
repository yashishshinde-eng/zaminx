import { useEffect, useState } from "react";
import { ArrowUp, ArrowDown, Trash2, Plus, Eye, Pencil } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { BlockRenderer } from "@/components/cms/BlockRenderer";
import { useAdminPage, useCreatePage, useUpdatePage } from "@/hooks/useAdminCms";
import toast from "react-hot-toast";
import { contentBlockSchema } from "@zeminex/shared";
import type { ContentBlock, CreateCmsPageBody, UpdateCmsPageBody } from "@zeminex/shared";

type BlockType = ContentBlock["type"];
const BLOCK_TYPES: BlockType[] = ["hero", "heading", "paragraph", "features", "steps", "faq", "cta"];

interface CmsPageDialogProps {
  open: boolean;
  /** "create" seeds an empty page; "edit" loads the page by `slug`. */
  mode: "create" | "edit";
  slug?: string;
  onClose: () => void;
}

/** Create/edit a CMS page with a structured block editor + live preview. */
export function CmsPageDialog({ open, mode, slug, onClose }: CmsPageDialogProps) {
  const isEdit = mode === "edit";
  const { data, isLoading } = useAdminPage(isEdit ? slug : undefined);

  const [slugInput, setSlugInput] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"published" | "draft">("draft");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [tab, setTab] = useState<"edit" | "preview">("edit");

  // Seed local state from the loaded page (edit) or reset (create).
  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      if (data) {
        setSlugInput(data.slug);
        setTitle(data.title);
        setStatus(data.status);
        setSeoTitle(data.seo.title ?? "");
        setSeoDesc(data.seo.description ?? "");
        setBlocks(data.blocks ?? []);
      }
    } else {
      setSlugInput("");
      setTitle("");
      setStatus("draft");
      setSeoTitle("");
      setSeoDesc("");
      setBlocks([]);
    }
    setTab("edit");
  }, [open, isEdit, data]);

  const createMut = useCreatePage();
  const updateMut = useUpdatePage(slug);

  const validCreate = !isEdit && slugInput.trim().length > 0 && /^[a-z0-9-]+$/.test(slugInput) && title.trim().length > 0;
  const validEdit = isEdit && title.trim().length > 0;
  const valid = isEdit ? validEdit : validCreate;

  async function onSubmit() {
    if (!valid) return;
    // Client-side block validation surfaces specific errors before the round-trip.
    const blockRes = contentBlockSchema.array().safeParse(blocks);
    if (!blockRes.success) {
      toast.error(`Block invalid: ${blockRes.error.issues[0]?.path.join(".") ?? ""} — ${blockRes.error.issues[0]?.message}`);
      return;
    }
    const seo = { title: seoTitle || undefined, description: seoDesc || undefined };
    try {
      if (isEdit) {
        const body: UpdateCmsPageBody = { title: title.trim(), blocks: blockRes.data, seo, status };
        await updateMut.mutateAsync(body);
      } else {
        const body: CreateCmsPageBody = {
          slug: slugInput.trim(),
          title: title.trim(),
          blocks: blockRes.data,
          seo,
          status,
        };
        await createMut.mutateAsync(body);
      }
      onClose();
    } catch {
      /* interceptor toasts (409 dup slug / 400 validation) */
    }
  }

  const pending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onClose={onClose} labelledBy="cms-page-title" className="max-w-3xl">
      <h2 id="cms-page-title" className="text-lg font-semibold">
        {isEdit ? "Edit page" : "New page"}
      </h2>

      {isEdit && isLoading ? (
        <Skeleton className="mt-4 h-96 w-full" />
      ) : (
        <div className="mt-4 space-y-4">
          {/* Tabs */}
          <div className="flex gap-2">
            <Button size="sm" variant={tab === "edit" ? "default" : "outline"} onClick={() => setTab("edit")}>
              <Pencil className="size-4" /> Edit
            </Button>
            <Button size="sm" variant={tab === "preview" ? "default" : "outline"} onClick={() => setTab("preview")}>
              <Eye className="size-4" /> Preview
            </Button>
          </div>

          {tab === "edit" ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cms-slug">Slug</Label>
                  <Input
                    id="cms-slug"
                    value={slugInput}
                    onChange={(e) => setSlugInput(e.target.value.toLowerCase())}
                    disabled={isEdit}
                    placeholder="about-us"
                  />
                  {isEdit && <p className="text-xs text-muted-foreground">Slug cannot be changed after creation.</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cms-status">Status</Label>
                  <select
                    id="cms-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "published" | "draft")}
                    className="glass-input h-9 w-full px-3 text-sm"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="cms-title">Title</Label>
                  <Input id="cms-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cms-seo-title">SEO title (optional)</Label>
                  <Input id="cms-seo-title" value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cms-seo-desc">SEO description (optional)</Label>
                  <Input id="cms-seo-desc" value={seoDesc} onChange={(e) => setSeoDesc(e.target.value)} />
                </div>
              </div>

              <BlockEditor blocks={blocks} onChange={setBlocks} />
            </>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto rounded-lg border bg-background p-6">
              <p className="mb-4 text-xl font-bold">{title || "Untitled page"}</p>
              <BlockRenderer blocks={blocks} />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={pending || !valid}>
              {pending ? "Saving…" : isEdit ? "Save page" : "Create page"}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Block editor                                                       */
/* ------------------------------------------------------------------ */

function defaultBlock(type: BlockType): ContentBlock {
  switch (type) {
    case "hero":
      return { type: "hero", title: "" };
    case "heading":
      return { type: "heading", level: 2, text: "" };
    case "paragraph":
      return { type: "paragraph", text: "" };
    case "features":
      return { type: "features", items: [{ title: "", description: "" }] };
    case "steps":
      return { type: "steps", items: [{ title: "", description: "" }] };
    case "faq":
      return { type: "faq", items: [{ question: "", answer: "" }] };
    case "cta":
      return { type: "cta", title: "" };
  }
}

function BlockEditor({ blocks, onChange }: { blocks: ContentBlock[]; onChange: (b: ContentBlock[]) => void }) {
  const [addType, setAddType] = useState<BlockType>("paragraph");

  function update(i: number, patch: Partial<ContentBlock>) {
    onChange(blocks.map((b, j) => (j === i ? ({ ...b, ...patch } as ContentBlock) : b)));
  }
  function remove(i: number) {
    onChange(blocks.filter((_, j) => j !== i));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => (
        <div key={i} className="rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold capitalize">{block.type} block</span>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowUp className="size-4" />
              </Button>
              <Button size="icon" variant="ghost" disabled={i === blocks.length - 1} onClick={() => move(i, 1)}>
                <ArrowDown className="size-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => remove(i)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </div>
          <BlockFields block={block} onChange={(patch) => update(i, patch)} />
        </div>
      ))}

      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-2">
          <Label htmlFor="add-block">Add block</Label>
          <select
            id="add-block"
            value={addType}
            onChange={(e) => setAddType(e.target.value as BlockType)}
            className="glass-input h-9 w-full px-3 text-sm"
          >
            {BLOCK_TYPES.map((t) => (
              <option key={t} value={t} className="capitalize">
                {t}
              </option>
            ))}
          </select>
        </div>
        <Button variant="outline" onClick={() => onChange([...blocks, defaultBlock(addType)])}>
          <Plus className="size-4" /> Add
        </Button>
      </div>
    </div>
  );
}

/** Type-specific fields for a single block. */
function BlockFields({ block, onChange }: { block: ContentBlock; onChange: (patch: Partial<ContentBlock>) => void }) {
  switch (block.type) {
    case "hero":
      return (
        <div className="grid gap-3">
          <Input placeholder="Title" value={block.title} onChange={(e) => onChange({ title: e.target.value })} />
          <Input placeholder="Subtitle (optional)" value={block.subtitle ?? ""} onChange={(e) => onChange({ subtitle: e.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="CTA label (optional)" value={block.ctaLabel ?? ""} onChange={(e) => onChange({ ctaLabel: e.target.value })} />
            <Input placeholder="CTA href (optional)" value={block.ctaHref ?? ""} onChange={(e) => onChange({ ctaHref: e.target.value })} />
          </div>
        </div>
      );

    case "heading":
      return (
        <div className="grid gap-3 sm:grid-cols-4">
          <select
            value={block.level}
            onChange={(e) => onChange({ level: Number(e.target.value) as 1 | 2 | 3 })}
            className="glass-input h-9 px-3 text-sm"
          >
            <option value={1}>H1</option>
            <option value={2}>H2</option>
            <option value={3}>H3</option>
          </select>
          <Input className="sm:col-span-3" placeholder="Text" value={block.text} onChange={(e) => onChange({ text: e.target.value })} />
        </div>
      );

    case "paragraph":
      return <Input placeholder="Text" value={block.text} onChange={(e) => onChange({ text: e.target.value })} />;

    case "features":
      return (
        <ItemEditor
          items={block.items}
          onChange={(items) => onChange({ items })}
          fields={[
            { key: "title", placeholder: "Title" },
            { key: "description", placeholder: "Description" },
            { key: "icon", placeholder: "Icon (optional, lucide name)" },
          ]}
          newitem={() => ({ title: "", description: "", icon: "" })}
        />
      );

    case "steps":
      return (
        <ItemEditor
          items={block.items}
          onChange={(items) => onChange({ items })}
          fields={[
            { key: "title", placeholder: "Title" },
            { key: "description", placeholder: "Description" },
          ]}
          newitem={() => ({ title: "", description: "" })}
        />
      );

    case "faq":
      return (
        <ItemEditor
          items={block.items}
          onChange={(items) => onChange({ items })}
          fields={[
            { key: "question", placeholder: "Question" },
            { key: "answer", placeholder: "Answer" },
          ]}
          newitem={() => ({ question: "", answer: "" })}
        />
      );

    case "cta":
      return (
        <div className="grid gap-3">
          <Input placeholder="Title" value={block.title} onChange={(e) => onChange({ title: e.target.value })} />
          <Input placeholder="Description (optional)" value={block.description ?? ""} onChange={(e) => onChange({ description: e.target.value })} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="CTA label (optional)" value={block.ctaLabel ?? ""} onChange={(e) => onChange({ ctaLabel: e.target.value })} />
            <Input placeholder="CTA href (optional)" value={block.ctaHref ?? ""} onChange={(e) => onChange({ ctaHref: e.target.value })} />
          </div>
        </div>
      );

    default:
      return null;
  }
}

/** Generic add/remove/edit for `features`/`steps`/`faq` item arrays. */
function ItemEditor<T extends Record<string, string>>({
  items,
  onChange,
  fields,
  newitem,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  fields: { key: keyof T; placeholder: string }[];
  newitem: () => T;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="grid flex-1 gap-2 sm:grid-cols-2">
            {fields.map((f) => (
              <Input
                key={String(f.key)}
                placeholder={f.placeholder}
                value={item[f.key] ?? ""}
                onChange={(e) => onChange(items.map((it, j) => (j === i ? { ...it, [f.key]: e.target.value } : it)))}
              />
            ))}
          </div>
          <Button size="icon" variant="ghost" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={() => onChange([...items, newitem()])}>
        <Plus className="size-4" /> Add item
      </Button>
    </div>
  );
}

export default CmsPageDialog;