import { useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Upload, Camera, X, Pencil } from "lucide-react";

import { useCatalogMgmt, defaultTextDesign } from "@/lib/admin/catalog-mgmt/store";
import { useI18n, LANGS } from "@/lib/i18n";
import type { Background, CardVariant, Orientation, Translation } from "@/lib/admin/catalog-mgmt/types";
import { emptyTranslation } from "@/lib/admin/catalog-mgmt/types";
import { Section } from "./shared";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024;

interface UploadedItem {
  variant: CardVariant;
  background: Background;
  thumb: string;
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function measure(url: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 0, h: 0 });
    img.src = url;
  });
}

export function UploadCardsPage() {
  const nav = useNavigate();
  const { lang } = useI18n();
  const { addBackground, addVariant, deleteVariant, deleteBackground, t } = useCatalogMgmt();
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadedItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleFiles(files: FileList | File[]) {
    setBusy(true);
    const arr = Array.from(files);
    const created: UploadedItem[] = [];
    for (const file of arr) {
      if (!ACCEPTED.includes(file.type) || file.size > MAX_SIZE) continue;
      const url = await readFileAsDataURL(file);
      const { w, h } = await measure(url);
      const orientation: Orientation = w > h ? "horizontal" : w < h ? "vertical" : "square";
      const stem = file.name.replace(/\.[^.]+$/, "").slice(0, 60) || "card";
      const bg = await addBackground({
        internalName: stem,
        sourceImageUrl: url,
        thumbnailUrl: url,
        orientation,
        aspectRatio: w && h ? `${w}:${h}` : "4:5",
        visualStyles: [],
        visualObjects: [],
        mood: [],
        status: "active",
      });
      const translations: Partial<Record<string, Translation>> = {};
      for (const l of LANGS) translations[l.code] = emptyTranslation(l.code);
      const variant = await addVariant({
        backgroundId: bg.id,
        internalName: stem,
        primaryOccasion: "",
        additionalOccasions: [],
        recipients: [],
        styles: [],
        visualObjects: [],
        mood: [],
        ageGroup: "",
        orientation,
        translations: translations as CardVariant["translations"],
        textDesign: defaultTextDesign(),
        displayOrder: 0,
        isNew: true,
        isPopular: false,
        isRecommended: false,
        allowSharing: true,
        allowDownloading: true,
        status: "draft",
      });
      created.push({ variant, background: bg, thumb: url });
    }
    setItems((prev) => [...created, ...prev]);
    if (created.length > 0) toast.success(t("cm_up_added").replace("{n}", String(created.length)));
    setBusy(false);
  }

  function removeItem(item: UploadedItem) {
    deleteVariant(item.variant.id);
    deleteBackground(item.background.id);
    setItems((prev) => prev.filter((i) => i.variant.id !== item.variant.id));
  }

  return (
    <div className="space-y-4">
      <Section title={t("cm_up_title")}>
        <p className="mb-3 text-sm text-muted-foreground">{t("cm_up_subtitle")}</p>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
          }}
          className={`flex min-h-48 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center text-sm transition ${
            dragging ? "border-primary bg-primary/5" : "border-border/60 bg-muted/20"
          }`}
        >
          <Upload className="h-6 w-6 text-muted-foreground" />
          <p className="text-muted-foreground">{t("cm_up_drop")}</p>
          <p className="text-xs text-muted-foreground">{t("cm_up_hint")}</p>
          <p className="text-xs text-muted-foreground">{t("cm_up_accepted")}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {t("cm_up_choose")}
            </button>
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm hover:bg-muted/50 disabled:opacity-50"
            >
              <Camera className="h-4 w-4" />
              {t("cm_up_from_camera")}
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(",")}
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) void handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              if (e.target.files?.length) void handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      </Section>

      <Section
        title={`${t("cm_up_uploaded")} · ${items.length}`}
        actions={
          items.length > 0 ? (
            <button
              type="button"
              onClick={() => nav({ to: "/admin/catalog/variants" })}
              className="rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs text-primary hover:bg-primary/20"
            >
              {t("cm_up_next")}
            </button>
          ) : null
        }
      >
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("cm_up_empty")}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {items.map((it) => (
              <li
                key={it.variant.id}
                className="group relative overflow-hidden rounded-lg border border-border/60 bg-background"
              >
                <img
                  src={it.thumb}
                  alt={it.variant.internalName}
                  className="aspect-[4/5] w-full object-cover"
                />
                <div className="flex items-center justify-between gap-1 p-2">
                  <span className="truncate text-xs text-muted-foreground" title={it.variant.internalName}>
                    {it.variant.internalName}
                  </span>
                </div>
                <div className="flex gap-1 border-t border-border/60 p-1.5">
                  <Link
                    to="/admin/catalog/variants/$id"
                    params={{ id: it.variant.id }}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20"
                  >
                    <Pencil className="h-3 w-3" />
                    {t("cm_up_edit")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeItem(it)}
                    className="rounded-md border border-border/60 bg-background px-2 py-1 text-xs text-muted-foreground hover:bg-muted/50"
                    title={t("cm_up_remove")}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
