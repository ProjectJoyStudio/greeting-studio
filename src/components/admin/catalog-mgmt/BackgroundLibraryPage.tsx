import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Search, Copy, Eye, EyeOff, Pencil, Trash2, Layers } from "lucide-react";

import { useCatalogMgmt } from "@/lib/admin/catalog-mgmt/store";
import { useI18n } from "@/lib/i18n";
import type { Background, BackgroundStatus, Orientation } from "@/lib/admin/catalog-mgmt/types";
import { BgStatusBadge, EmptyState, Section, TaxonomyLabels, useConfirm } from "./shared";

export function BackgroundLibraryPage() {
  const { backgrounds, variantsUsingBackground, deleteBackground, duplicateBackground, updateBackground, taxonomy, t } = useCatalogMgmt();
  const { lang } = useI18n();
  const [q, setQ] = useState("");
  const [orientation, setOrientation] = useState<Orientation | "">("");
  const [status, setStatus] = useState<BackgroundStatus | "">("");
  const [style, setStyle] = useState("");
  const [mood, setMood] = useState("");
  const [obj, setObj] = useState("");
  const [limit, setLimit] = useState(24);
  const { ask, dialog } = useConfirm();

  const filtered = useMemo(() => {
    return backgrounds.filter((b) => {
      if (q && !b.internalName.toLowerCase().includes(q.toLowerCase())) return false;
      if (orientation && b.orientation !== orientation) return false;
      if (status && b.status !== status) return false;
      if (style && !b.visualStyles.includes(style)) return false;
      if (mood && !b.mood.includes(mood)) return false;
      if (obj && !b.visualObjects.includes(obj)) return false;
      return true;
    });
  }, [backgrounds, q, orientation, status, style, mood, obj]);

  const visible = filtered.slice(0, limit);

  return (
    <div className="space-y-4">
      {dialog}
      <Section
        title={t("cm_bg_title")}
        description={t("cm_bg_subtitle")}
        actions={
          <Link
            to="/admin/catalog/backgrounds/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            {t("cm_bg_new")}
          </Link>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("cm_search")}
              className="w-full rounded-md border border-border/60 bg-background py-2 pl-8 pr-3 text-sm outline-none focus:border-primary/60"
            />
          </div>
          <select value={orientation} onChange={(e) => setOrientation(e.target.value as Orientation | "")} className="rounded-md border border-border/60 bg-background px-2 py-2 text-sm">
            <option value="">{t("cm_bg_orientation")}</option>
            {taxonomy.orientation.map((o) => (
              <option key={o.key} value={o.key}>{o.names[lang] || o.names.en}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value as BackgroundStatus | "")} className="rounded-md border border-border/60 bg-background px-2 py-2 text-sm">
            <option value="">{t("cm_status")}</option>
            {(["draft", "active", "hidden", "archived"] as BackgroundStatus[]).map((s) => (
              <option key={s} value={s}>{t(`cm_status_${s}`)}</option>
            ))}
          </select>
          <select value={style} onChange={(e) => setStyle(e.target.value)} className="rounded-md border border-border/60 bg-background px-2 py-2 text-sm">
            <option value="">{t("cm_bg_styles")}</option>
            {taxonomy.style.map((o) => (<option key={o.key} value={o.key}>{o.names[lang] || o.names.en}</option>))}
          </select>
          <select value={mood} onChange={(e) => setMood(e.target.value)} className="rounded-md border border-border/60 bg-background px-2 py-2 text-sm">
            <option value="">{t("cm_bg_mood")}</option>
            {taxonomy.mood.map((o) => (<option key={o.key} value={o.key}>{o.names[lang] || o.names.en}</option>))}
          </select>
          <select value={obj} onChange={(e) => setObj(e.target.value)} className="rounded-md border border-border/60 bg-background px-2 py-2 text-sm">
            <option value="">{t("cm_bg_objects")}</option>
            {taxonomy.visualObject.map((o) => (<option key={o.key} value={o.key}>{o.names[lang] || o.names.en}</option>))}
          </select>
        </div>
      </Section>

      {visible.length === 0 ? (
        <EmptyState
          title={t("cm_bg_empty")}
          hint={t("cm_no_results")}
          action={
            <Link to="/admin/catalog/backgrounds/new" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90">
              <Plus className="h-4 w-4" /> {t("cm_bg_new")}
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(128px,1fr))]">
          {visible.map((bg) => (
            <BackgroundCompactCard
              key={bg.id}
              bg={bg}
              usedBy={variantsUsingBackground(bg.id)}
              taxonomy={taxonomy}
              lang={lang}
              t={t}
              ask={ask}
              onDelete={(id) => {
                ask(t("cm_confirm_delete"), async () => {
                  const ok = await deleteBackground(id);
                  if (!ok) toast.error(t("cm_confirm_delete_used"));
                  else toast.success(t("cm_deleted"));
                });
              }}
              onDuplicate={(id) => {
                duplicateBackground(id);
                toast.success(t("cm_duplicated"));
              }}
              onToggleStatus={(id, current) => {
                updateBackground(id, { status: current === "hidden" ? "active" : "hidden" });
                toast.success(current === "hidden" ? t("cm_saved") : t("cm_hidden_toast"));
              }}
            />
          ))}
        </div>
      )}

      {visible.length < filtered.length && (
        <div className="flex justify-center">
          <button
            type="button"
            className="rounded-md border border-border/60 bg-background px-4 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => setLimit((l) => l + 24)}
          >
            {t("cm_load_more")}
          </button>
        </div>
      )}
    </div>
  );
}

function BackgroundCompactCard({
  bg,
  usedBy,
  taxonomy,
  lang,
  t,
  ask,
  onDelete,
  onDuplicate,
  onToggleStatus,
}: {
  bg: Background;
  usedBy: CardVariant[];
  taxonomy: any;
  lang: string;
  t: (k: string) => string;
  ask: (title: string, onOk: () => void) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onToggleStatus: (id: string, current: BackgroundStatus) => void;
}) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border border-border/60 bg-card/70 transition hover:border-primary/40 hover:bg-secondary/50">
      <Link
        to="/admin/catalog/backgrounds/$id"
        params={{ id: bg.id }}
        className="relative block"
        title={bg.internalName}
      >
        {bg.thumbnailUrl ? (
          <img
            src={bg.thumbnailUrl}
            alt={bg.internalName}
            className="aspect-square w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="aspect-square w-full bg-muted" />
        )}
        <div className="absolute right-1.5 top-1.5">
          <BgStatusBadge status={bg.status} />
        </div>
      </Link>
      <div className="min-w-0 space-y-1 px-2 py-1.5">
        <p className="truncate text-[11px] font-medium leading-tight text-foreground">{bg.internalName}</p>
        <p className="truncate text-[10px] text-muted-foreground">
          {bg.orientation} · {bg.aspectRatio} · {usedBy.length} {t("cm_ov_uses")}
        </p>
        <TaxonomyLabels items={taxonomy.style} keys={bg.visualStyles} lang={lang} max={2} />
      </div>
      <div className="mt-auto flex flex-wrap gap-1 border-t border-border/40 px-2 py-1.5">
        <Link
          to="/admin/catalog/backgrounds/$id"
          params={{ id: bg.id }}
          className="inline-flex items-center gap-1 rounded border border-border/60 bg-background px-1.5 py-0.5 text-[10px] hover:bg-muted/50"
        >
          <Pencil className="h-3 w-3" /> {t("cm_edit")}
        </Link>
        <Link
          to="/admin/catalog/variants/new"
          search={{ backgroundId: bg.id }}
          className="inline-flex items-center gap-1 rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary hover:bg-primary/20"
        >
          <Layers className="h-3 w-3" /> {t("cm_bg_create_variant")}
        </Link>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded border border-border/60 bg-background px-1.5 py-0.5 text-[10px] hover:bg-muted/50"
          onClick={() => onDuplicate(bg.id)}
        >
          <Copy className="h-3 w-3" /> {t("cm_duplicate")}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded border border-border/60 bg-background px-1.5 py-0.5 text-[10px] hover:bg-muted/50"
          onClick={() => onToggleStatus(bg.id, bg.status)}
        >
          {bg.status === "hidden" ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          {bg.status === "hidden" ? t("cm_show") : t("cm_hide")}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded border border-destructive/40 bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive hover:bg-destructive/20"
          onClick={() => onDelete(bg.id)}
        >
          <Trash2 className="h-3 w-3" /> {t("cm_delete")}
        </button>
      </div>
    </div>
  );
}
