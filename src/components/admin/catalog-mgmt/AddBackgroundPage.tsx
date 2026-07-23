import { useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

import { useCatalogMgmt } from "@/lib/admin/catalog-mgmt/store";
import { useI18n } from "@/lib/i18n";
import type { Background, BackgroundStatus, Orientation } from "@/lib/admin/catalog-mgmt/types";
import { CATALOG_MGMT_GRADIENTS } from "@/lib/admin/catalog-mgmt/types";
import { Section, CardPreview, TaxonomyMultiSelect, BgStatusBadge } from "./shared";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024;

export function AddBackgroundPage({ editId }: { editId?: string }) {
  const nav = useNavigate();
  const { lang } = useI18n();
  const { addBackground, updateBackground, getBackground, taxonomy, t } = useCatalogMgmt();
  const existing = editId ? getBackground(editId) : undefined;
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const [form, setForm] = useState<Omit<Background, "id" | "createdAt" | "updatedAt">>(() => ({
    internalName: existing?.internalName ?? "",
    sourceImageUrl: existing?.sourceImageUrl ?? "",
    thumbnailUrl: existing?.thumbnailUrl ?? "",
    orientation: existing?.orientation ?? "vertical",
    aspectRatio: existing?.aspectRatio ?? "4:5",
    visualStyles: existing?.visualStyles ?? [],
    visualObjects: existing?.visualObjects ?? [],
    mood: existing?.mood ?? [],
    status: existing?.status ?? "draft",
    internalNotes: existing?.internalNotes ?? "",
    gradientIndex: existing?.gradientIndex ?? Math.floor(Math.random() * CATALOG_MGMT_GRADIENTS.length),
  }));
  const [imgDim, setImgDim] = useState<{ w: number; h: number } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const previewBg = useMemo<Background>(
    () => ({
      ...form,
      id: existing?.id ?? "preview",
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: existing?.updatedAt ?? new Date().toISOString(),
    }),
    [form, existing],
  );

  function readFile(file: File) {
    setFileError(null);
    if (!ACCEPTED.includes(file.type)) {
      setFileError(t("cm_bg_accepted"));
      return;
    }
    if (file.size > MAX_SIZE) {
      setFileError(t("cm_bg_accepted"));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = String(e.target?.result ?? "");
      const img = new Image();
      img.onload = () => {
        setImgDim({ w: img.naturalWidth, h: img.naturalHeight });
      };
      img.src = url;
      setForm((f) => ({ ...f, sourceImageUrl: url, thumbnailUrl: url }));
    };
    reader.readAsDataURL(file);
  }

  async function save(nextStatus?: BackgroundStatus, thenCreateVariant = false) {
    if (!form.internalName.trim()) {
      setNameError(t("cm_v_internal_required"));
      return;
    }
    const patch = nextStatus ? { ...form, status: nextStatus } : form;
    if (existing) {
      await updateBackground(existing.id, patch);
      toast.success(t("cm_bg_saved"));
      if (thenCreateVariant) nav({ to: "/admin/catalog/variants/new", search: { backgroundId: existing.id } });
      else nav({ to: "/admin/catalog/backgrounds" });
    } else {
      const created = await addBackground(patch);
      toast.success(t("cm_bg_saved"));
      if (thenCreateVariant) nav({ to: "/admin/catalog/variants/new", search: { backgroundId: created.id } });
      else nav({ to: "/admin/catalog/backgrounds" });
    }
  }

  const lowQuality = imgDim && (imgDim.w < 1200 || imgDim.h < 1200);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <Section title={existing ? t("cm_edit") : t("cm_bg_new")}>
          <div
            className={`flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-sm transition ${
              dragging ? "border-primary bg-primary/5" : "border-border/60 bg-muted/20"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) readFile(file);
            }}
          >
            {form.sourceImageUrl ? (
              <div className="w-full">
                <img src={form.sourceImageUrl} alt="" className="mx-auto max-h-64 rounded-lg" />
                <div className="mt-3 flex justify-center gap-2">
                  <button type="button" onClick={() => fileInput.current?.click()} className="rounded-md border border-border/60 bg-background px-3 py-1.5 text-xs hover:bg-muted/50">
                    {t("cm_bg_replace")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, sourceImageUrl: "", thumbnailUrl: "" }));
                      setImgDim(null);
                    }}
                    className="rounded-md border border-border/60 bg-background px-3 py-1.5 text-xs hover:bg-muted/50"
                  >
                    <X className="mr-1 inline h-3 w-3" />
                    {t("cm_bg_remove")}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground" />
                <p className="text-muted-foreground">{t("cm_bg_drop_here")}</p>
                <p className="text-xs text-muted-foreground">{t("cm_bg_accepted")}</p>
                <button type="button" onClick={() => fileInput.current?.click()} className="mt-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90">
                  {t("cm_bg_upload")}
                </button>
              </>
            )}
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPTED.join(",")}
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) readFile(f);
              }}
            />
          </div>
          {fileError && <p className="mt-2 text-xs text-destructive">{fileError}</p>}
          {imgDim && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("cm_bg_dimensions")}: {imgDim.w}×{imgDim.h}px
              {lowQuality && <span className="ml-2 text-amber-600">— {t("cm_bg_low_quality")}</span>}
            </p>
          )}
        </Section>

        <Section title={t("cm_bg_title")}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("cm_bg_internal_name") + " *"} error={nameError ?? undefined}>
              <input
                value={form.internalName}
                onChange={(e) => {
                  setForm({ ...form, internalName: e.target.value });
                  setNameError(null);
                }}
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
              />
            </Field>
            <Field label={t("cm_bg_orientation")}>
              <select
                value={form.orientation}
                onChange={(e) => setForm({ ...form, orientation: e.target.value as Orientation })}
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
              >
                {taxonomy.orientation.map((o) => (
                  <option key={o.key} value={o.key}>{o.names[lang] || o.names.en}</option>
                ))}
              </select>
            </Field>
            <Field label={t("cm_bg_aspect_ratio")}>
              <select
                value={form.aspectRatio}
                onChange={(e) => setForm({ ...form, aspectRatio: e.target.value })}
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
              >
                {["4:5", "1:1", "16:9", "3:4", "9:16", "3:2", "2:3"].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </Field>
            <Field label={t("cm_status")}>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as BackgroundStatus })}
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
              >
                {(["draft", "active", "hidden", "archived"] as BackgroundStatus[]).map((s) => (
                  <option key={s} value={s}>{t(`cm_status_${s}`)}</option>
                ))}
              </select>
            </Field>
            <Field label={t("cm_bg_styles")}>
              <TaxonomyMultiSelect items={taxonomy.style} value={form.visualStyles} onChange={(v) => setForm({ ...form, visualStyles: v })} lang={lang} />
            </Field>
            <Field label={t("cm_bg_objects")}>
              <TaxonomyMultiSelect items={taxonomy.visualObject} value={form.visualObjects} onChange={(v) => setForm({ ...form, visualObjects: v })} lang={lang} />
            </Field>
            <Field label={t("cm_bg_mood")}>
              <TaxonomyMultiSelect items={taxonomy.mood} value={form.mood} onChange={(v) => setForm({ ...form, mood: v })} lang={lang} />
            </Field>
            <Field label={t("cm_bg_notes")}>
              <textarea
                value={form.internalNotes ?? ""}
                onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
              />
            </Field>
          </div>
        </Section>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => save("draft")} className="rounded-md border border-border/60 bg-background px-4 py-2 text-sm hover:bg-muted/50">
            {t("cm_save_draft")}
          </button>
          <button type="button" onClick={() => save()} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            {t("cm_save")}
          </button>
          <button type="button" onClick={() => save("active", true)} className="rounded-md border border-primary/40 bg-primary/10 px-4 py-2 text-sm text-primary hover:bg-primary/20">
            {t("cm_bg_save_and_variant")}
          </button>
          <button type="button" onClick={() => nav({ to: "/admin/catalog/backgrounds" })} className="rounded-md border border-border/60 bg-background px-4 py-2 text-sm hover:bg-muted/50">
            {t("cm_cancel")}
          </button>
        </div>
      </div>

      <div className="space-y-4 lg:sticky lg:top-6 lg:h-fit">
        <Section title={t("cm_bg_preview_desktop")} actions={<BgStatusBadge status={form.status} />}>
          <CardPreview background={previewBg} lang={lang} aspect={form.aspectRatio.replace(":", " / ")} />
        </Section>
        <Section title={t("cm_bg_preview_mobile")}>
          <div className="mx-auto w-32">
            <CardPreview background={previewBg} lang={lang} aspect={form.aspectRatio.replace(":", " / ")} />
          </div>
        </Section>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block text-muted-foreground">{label}</span>
      {children}
      {error && <span className="mt-1 block text-destructive">{error}</span>}
    </label>
  );
}