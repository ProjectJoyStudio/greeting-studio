import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";

import { useCatalogMgmt } from "@/lib/admin/catalog-mgmt/store";
import { useI18n } from "@/lib/i18n";
import type { BackgroundStatus, Orientation } from "@/lib/admin/catalog-mgmt/types";
import { BgStatusBadge, CardPreview, EmptyState, Section, TaxonomyLabels, useConfirm } from "./shared";

export function BackgroundLibraryPage() {
  const { backgrounds, variantsUsingBackground, deleteBackground, duplicateBackground, updateBackground, taxonomy, t } = useCatalogMgmt();
  const { lang } = useI18n();
  const [q, setQ] = useState("");
  const [orientation, setOrientation] = useState<Orientation | "">("");
  const [status, setStatus] = useState<BackgroundStatus | "">("");
  const [style, setStyle] = useState("");
  const [mood, setMood] = useState("");
  const [obj, setObj] = useState("");
  const [limit, setLimit] = useState(12);
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((bg) => {
            const usedBy = variantsUsingBackground(bg.id);
            return (
              <div key={bg.id} className="flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card/85 shadow-sm">
                <CardPreview background={bg} lang={lang} aspect={bg.aspectRatio.replace(":", " / ")} />
                <div className="flex flex-1 flex-col gap-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-medium">{bg.internalName}</p>
                    <BgStatusBadge status={bg.status} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {bg.orientation} · {bg.aspectRatio} · {usedBy.length} {t("cm_ov_uses")}
                  </div>
                  <TaxonomyLabels items={taxonomy.style} keys={bg.visualStyles} lang={lang} />
                  <TaxonomyLabels items={taxonomy.visualObject} keys={bg.visualObjects} lang={lang} />
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-2 text-xs">
                    <Link to="/admin/catalog/backgrounds/$id" params={{ id: bg.id }} className="rounded border border-border/60 bg-background px-2 py-1 hover:bg-muted/50">
                      {t("cm_edit")}
                    </Link>
                    <Link
                      to="/admin/catalog/variants/new"
                      search={{ backgroundId: bg.id }}
                      className="rounded border border-primary/40 bg-primary/10 px-2 py-1 text-primary hover:bg-primary/20"
                    >
                      {t("cm_bg_create_variant")}
                    </Link>
                    <button
                      type="button"
                      className="rounded border border-border/60 bg-background px-2 py-1 hover:bg-muted/50"
                      onClick={() => {
                        duplicateBackground(bg.id);
                        toast.success(t("cm_duplicated"));
                      }}
                    >
                      {t("cm_duplicate")}
                    </button>
                    <button
                      type="button"
                      className="rounded border border-border/60 bg-background px-2 py-1 hover:bg-muted/50"
                      onClick={() => {
                        updateBackground(bg.id, { status: bg.status === "hidden" ? "active" : "hidden" });
                        toast.success(bg.status === "hidden" ? t("cm_saved") : t("cm_hidden_toast"));
                      }}
                    >
                      {bg.status === "hidden" ? t("cm_show") : t("cm_hide")}
                    </button>
                    <button
                      type="button"
                      className="rounded border border-destructive/40 bg-destructive/10 px-2 py-1 text-destructive hover:bg-destructive/20"
                      onClick={() =>
                        ask(t("cm_confirm_delete"), () => {
                          const ok = deleteBackground(bg.id);
                          if (!ok) toast.error(t("cm_confirm_delete_used"));
                          else toast.success(t("cm_deleted"));
                        })
                      }
                    >
                      {t("cm_delete")}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {visible.length < filtered.length && (
        <div className="flex justify-center">
          <button
            type="button"
            className="rounded-md border border-border/60 bg-background px-4 py-1.5 text-sm hover:bg-muted/50"
            onClick={() => setLimit((l) => l + 12)}
          >
            {t("cm_load_more")}
          </button>
        </div>
      )}
    </div>
  );
}