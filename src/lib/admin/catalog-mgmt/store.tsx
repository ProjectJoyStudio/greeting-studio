import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { useI18n, type Lang, LANGS } from "@/lib/i18n";
import type {
  Background,
  CardVariant,
  Taxonomy,
  TaxonomyItem,
  TaxonomyKind,
  Translation,
  TextDesign,
  VariantStatus,
  BackgroundStatus,
} from "./types";
import { defaultTextDesign, emptyTranslation, translationCompleteness } from "./types";
import { DEFAULT_TAXONOMY } from "./taxonomy";
import { cmT } from "./i18n";
import {
  ensureTaxonomyForLocal,
  fetchAllTaxonomyIds,
  listBackgrounds,
  listVariants,
  insertBackground,
  patchBackgroundShallow,
  softDeleteBackground,
  hardDeleteBackground,
  upsertVariant,
  patchVariantShallow,
  softDeleteVariant,
  uploadBackgroundImage,
  dataUrlToFile,
  getSignedUrl,
  reverseSlugMap,
  rowToBackground,
  rowsToVariant,
  insertTaxonomyItemDb,
  updateTaxonomyItemDb,
  deleteTaxonomyItemDb,
  reorderTaxonomyItemsDb,
  LOCAL_TAX_KIND,
  type SlugIdMap,
  type VariantWritePayload,
} from "./repo";

interface Ctx {
  backgrounds: Background[];
  variants: CardVariant[];
  taxonomy: Taxonomy;
  loading: boolean;
  refresh: () => Promise<void>;
  // background ops
  addBackground: (b: Omit<Background, "id" | "createdAt" | "updatedAt">) => Promise<Background>;
  updateBackground: (id: string, patch: Partial<Background>) => Promise<void>;
  deleteBackground: (id: string) => Promise<boolean>;
  duplicateBackground: (id: string) => Promise<Background | null>;
  // variant ops
  addVariant: (v: Omit<CardVariant, "id" | "createdAt" | "updatedAt">) => Promise<CardVariant>;
  updateVariant: (id: string, patch: Partial<CardVariant>) => Promise<void>;
  deleteVariant: (id: string) => Promise<void>;
  duplicateVariant: (id: string) => Promise<CardVariant | null>;
  bulkUpdateVariants: (ids: string[], patch: Partial<CardVariant>) => Promise<void>;
  variantsUsingBackground: (bgId: string) => CardVariant[];
  getBackground: (id: string) => Background | undefined;
  getVariant: (id: string) => CardVariant | undefined;
  // taxonomy ops
  addTaxonomy: (kind: TaxonomyKind, item: TaxonomyItem) => Promise<void>;
  updateTaxonomy: (kind: TaxonomyKind, key: string, patch: Partial<TaxonomyItem>) => Promise<void>;
  deleteTaxonomy: (kind: TaxonomyKind, key: string) => Promise<{ ok: boolean; usage: number }>;
  reorderTaxonomy: (kind: TaxonomyKind, keys: string[]) => Promise<void>;
  taxonomyUsage: (kind: TaxonomyKind, key: string) => number;
  t: (k: string) => string;
}

const CatalogMgmtCtx = createContext<Ctx | null>(null);

export function CatalogMgmtProvider({ children }: { children: ReactNode }) {
  const { lang } = useI18n();
  const t = useCallback((k: string) => cmT(lang, k), [lang]);

  const [backgrounds, setBackgrounds] = useState<Background[]>([]);
  const [variants, setVariants] = useState<CardVariant[]>([]);
  const [taxonomy, setTaxonomy] = useState<Taxonomy>(() => structuredClone(DEFAULT_TAXONOMY));
  const [loading, setLoading] = useState(true);
  const slugIdsRef = useRef<SlugIdMap | null>(null);

  const refresh = useCallback(async () => {
    if (!slugIdsRef.current) {
      slugIdsRef.current = await fetchAllTaxonomyIds();
    }
    const idSlug = reverseSlugMap(slugIdsRef.current);
    const [bgList, cvData] = await Promise.all([listBackgrounds(), listVariants()]);
    // Hydrate backgrounds with signed URLs in parallel
    const localBgs = await Promise.all(
      bgList.map(async ({ row, asset }) => {
        const url = asset ? await getSignedUrl(asset.storage_bucket, asset.storage_path) : null;
        return rowToBackground(row, asset, url);
      }),
    );
    setBackgrounds(localBgs);

    // Group junction rows by variant id
    const group = <T extends { card_variant_id: string }>(rows: T[], key: keyof T) => {
      const m = new Map<string, string[]>();
      for (const r of rows) {
        const arr = m.get(r.card_variant_id) ?? [];
        arr.push(r[key] as unknown as string);
        m.set(r.card_variant_id, arr);
      }
      return m;
    };
    const addOccM = group(cvData.junctions.additional_occasions, "occasion_id");
    const recM = group(cvData.junctions.recipients, "recipient_id");
    const catM = group(cvData.junctions.categories, "category_id");
    const tagM = group(cvData.junctions.tags, "tag_id");
    const voM = group(cvData.junctions.visual_objects, "visual_object_id");
    const themeM = group(cvData.junctions.themes, "theme_id");
    const seasonM = group(cvData.junctions.seasons, "season_id");
    const trM = new Map<string, typeof cvData.translations>();
    for (const tr of cvData.translations) {
      const arr = trM.get(tr.card_variant_id) ?? [];
      arr.push(tr);
      trM.set(tr.card_variant_id, arr);
    }
    const tdM = new Map<string, (typeof cvData.textDesigns)[number]>();
    for (const td of cvData.textDesigns) tdM.set(td.card_variant_id, td);

    const localVariants = cvData.variants.map((v) =>
      rowsToVariant(
        v,
        idSlug,
        addOccM.get(v.id) ?? [],
        recM.get(v.id) ?? [],
        catM.get(v.id) ?? [],
        tagM.get(v.id) ?? [],
        voM.get(v.id) ?? [],
        themeM.get(v.id) ?? [],
        seasonM.get(v.id) ?? [],
        trM.get(v.id) ?? [],
        tdM.get(v.id),
      ),
    );
    setVariants(localVariants);
  }, []);

  // Hydrate on mount: ensure the local taxonomy exists in DB, then load rows.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        slugIdsRef.current = await ensureTaxonomyForLocal(DEFAULT_TAXONOMY);
        if (cancelled) return;
        await refresh();
      } catch (e) {
        console.error("Catalog hydration failed", e);
        toast.error("Failed to load catalog");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const getBackground = useCallback(
    (id: string) => backgrounds.find((b) => b.id === id),
    [backgrounds],
  );
  const getVariant = useCallback(
    (id: string) => variants.find((v) => v.id === id),
    [variants],
  );
  const variantsUsingBackground = useCallback(
    (bgId: string) => variants.filter((v) => v.backgroundId === bgId),
    [variants],
  );

  // --- Backgrounds ---------------------------------------------------------

  const addBackground: Ctx["addBackground"] = async (b) => {
    let mediaAssetId: string | null = null;
    if (b.sourceImageUrl?.startsWith("data:")) {
      try {
        const file = await dataUrlToFile(b.sourceImageUrl, b.internalName || "background");
        const up = await uploadBackgroundImage(file);
        mediaAssetId = up.mediaAssetId;
      } catch (e) {
        console.error("Background upload failed", e);
        toast.error("Upload failed");
        throw e;
      }
    }
    const row = await insertBackground({
      internalName: b.internalName,
      orientation: b.orientation,
      status: b.status,
      mediaAssetId,
      internalNotes: b.internalNotes,
    });
    await refresh();
    const created = { ...b, id: row.id, createdAt: row.created_at, updatedAt: row.updated_at, mediaAssetId };
    return created;
  };

  const updateBackground: Ctx["updateBackground"] = async (id, patch) => {
    // Optimistic
    setBackgrounds((list) =>
      list.map((b) => (b.id === id ? { ...b, ...patch, updatedAt: new Date().toISOString() } : b)),
    );
    try {
      const dbPatch: Parameters<typeof patchBackgroundShallow>[1] = {};
      if (patch.internalName !== undefined) dbPatch.internal_name = patch.internalName;
      if (patch.orientation !== undefined) dbPatch.orientation = patch.orientation;
      if (patch.status !== undefined) dbPatch.status = patch.status;
      if (patch.internalNotes !== undefined) dbPatch.internal_notes = patch.internalNotes ?? null;
      if (Object.keys(dbPatch).length > 0) await patchBackgroundShallow(id, dbPatch);
    } catch (e) {
      console.error(e);
      toast.error("Save failed");
      await refresh();
    }
  };

  const deleteBackground: Ctx["deleteBackground"] = async (id) => {
    if (variantsUsingBackground(id).length > 0) return false;
    setBackgrounds((list) => list.filter((b) => b.id !== id));
    try {
      await hardDeleteBackground(id);
      return true;
    } catch (e) {
      console.error(e);
      toast.error("Delete failed");
      await refresh();
      return false;
    }
  };

  const duplicateBackground: Ctx["duplicateBackground"] = async (id) => {
    const src = getBackground(id);
    if (!src) return null;
    // Re-insert a row that reuses the same media asset (no re-upload).
    const row = await insertBackground({
      internalName: `${src.internalName}-copy`,
      orientation: src.orientation,
      status: "draft",
      mediaAssetId: src.mediaAssetId ?? null,
      internalNotes: src.internalNotes,
    });
    await refresh();
    return { ...src, id: row.id, internalName: `${src.internalName}-copy`, status: "draft", createdAt: row.created_at, updatedAt: row.updated_at };
  };

  // --- Card variants -------------------------------------------------------

  function localToPayload(v: Omit<CardVariant, "id" | "createdAt" | "updatedAt">): VariantWritePayload {
    // Collect search keywords across languages (unique)
    const kw = new Set<string>();
    for (const tr of Object.values(v.translations)) {
      for (const k of tr?.searchKeywords ?? []) kw.add(k);
    }
    return {
      backgroundId: v.backgroundId,
      internalName: v.internalName,
      orientation: v.orientation,
      status: v.status,
      primaryOccasionSlug: v.primaryOccasion || undefined,
      styleSlug: v.styles[0],
      moodSlug: v.mood[0],
      ageGroupSlug: v.ageGroup || undefined,
      additionalOccasionSlugs: v.additionalOccasions,
      recipientSlugs: v.recipients,
      categorySlugs: [],
      tagSlugs: [],
      visualObjectSlugs: v.visualObjects,
      themeSlugs: [],
      seasonSlugs: [],
      isNew: v.isNew,
      isPopular: v.isPopular,
      isRecommended: v.isRecommended,
      isHidden: v.status === "hidden",
      isArchived: v.status === "archived",
      allowSharing: v.allowSharing,
      allowDownloading: v.allowDownloading,
      displayOrder: v.displayOrder,
      publicationDate: v.publishAt ?? null,
      internalNotes: v.internalNotes,
      searchKeywords: [...kw],
      translations: v.translations as Partial<Record<Lang, Translation>>,
      textDesign: v.textDesign,
    };
  }

  const addVariant: Ctx["addVariant"] = async (v) => {
    if (!slugIdsRef.current) slugIdsRef.current = await ensureTaxonomyForLocal(DEFAULT_TAXONOMY);
    const id = await upsertVariant(null, localToPayload(v), slugIdsRef.current);
    await refresh();
    const created = getVariantFromStateRef(id) ?? {
      ...v,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return created;
  };

  // Helper to read the freshly hydrated variant without stale closure
  const variantsRef = useRef<CardVariant[]>([]);
  useEffect(() => {
    variantsRef.current = variants;
  }, [variants]);
  function getVariantFromStateRef(id: string): CardVariant | undefined {
    return variantsRef.current.find((v) => v.id === id);
  }

  // Only these keys are "shallow" — anything else requires a full upsert.
  const SHALLOW_KEYS = new Set<keyof CardVariant>([
    "status",
    "isNew",
    "isPopular",
    "isRecommended",
    "allowSharing",
    "allowDownloading",
    "displayOrder",
    "internalName",
    "internalNotes",
    "publishAt",
    "primaryOccasion",
    "backgroundId",
  ]);

  const updateVariant: Ctx["updateVariant"] = async (id, patch) => {
    // Optimistic
    setVariants((list) =>
      list.map((v) => (v.id === id ? { ...v, ...patch, updatedAt: new Date().toISOString() } : v)),
    );
    const isShallow = Object.keys(patch).every((k) => SHALLOW_KEYS.has(k as keyof CardVariant));
    try {
      if (isShallow) {
        const dbPatch: Parameters<typeof patchVariantShallow>[1] = {};
        if (patch.status !== undefined) {
          dbPatch.status = patch.status;
          dbPatch.is_hidden = patch.status === "hidden";
          dbPatch.is_archived = patch.status === "archived";
        }
        if (patch.isNew !== undefined) dbPatch.is_new = patch.isNew;
        if (patch.isPopular !== undefined) dbPatch.is_popular = patch.isPopular;
        if (patch.isRecommended !== undefined) dbPatch.is_recommended = patch.isRecommended;
        if (patch.allowSharing !== undefined) dbPatch.allow_sharing = patch.allowSharing;
        if (patch.allowDownloading !== undefined) dbPatch.allow_downloading = patch.allowDownloading;
        if (patch.displayOrder !== undefined) dbPatch.display_order = patch.displayOrder;
        if (patch.internalName !== undefined) dbPatch.internal_name = patch.internalName;
        if (patch.internalNotes !== undefined) dbPatch.internal_notes = patch.internalNotes ?? null;
        if (patch.publishAt !== undefined) dbPatch.publication_date = patch.publishAt ?? null;
        if (patch.backgroundId !== undefined) dbPatch.background_id = patch.backgroundId;
        if (patch.primaryOccasion !== undefined) {
          const ids = slugIdsRef.current;
          dbPatch.primary_occasion_id = ids?.occasion.get(patch.primaryOccasion) ?? null;
        }
        if (Object.keys(dbPatch).length > 0) await patchVariantShallow(id, dbPatch);
      } else {
        // Merge patch with current state and full upsert
        const cur = variantsRef.current.find((v) => v.id === id);
        if (!cur) throw new Error("variant not found");
        const merged = { ...cur, ...patch } as CardVariant;
        if (!slugIdsRef.current) slugIdsRef.current = await ensureTaxonomyForLocal(DEFAULT_TAXONOMY);
        await upsertVariant(id, localToPayload(merged), slugIdsRef.current);
        await refresh();
      }
    } catch (e) {
      console.error(e);
      toast.error("Save failed");
      await refresh();
    }
  };

  const deleteVariant: Ctx["deleteVariant"] = async (id) => {
    setVariants((list) => list.filter((v) => v.id !== id));
    try {
      await softDeleteVariant(id);
    } catch (e) {
      console.error(e);
      toast.error("Delete failed");
      await refresh();
    }
  };

  const duplicateVariant: Ctx["duplicateVariant"] = async (id) => {
    const src = getVariant(id);
    if (!src) return null;
    const translations: Partial<Record<Lang, Translation>> = {};
    for (const [k, tv] of Object.entries(src.translations)) {
      if (tv) translations[k as Lang] = { ...tv, searchKeywords: [...tv.searchKeywords] };
    }
    const copy: Omit<CardVariant, "id" | "createdAt" | "updatedAt"> = {
      ...src,
      internalName: `${src.internalName}-copy`,
      translations,
      textDesign: { ...src.textDesign },
      status: "draft",
      isNew: true,
      isPopular: false,
      isRecommended: false,
    };
    return addVariant(copy);
  };

  const bulkUpdateVariants: Ctx["bulkUpdateVariants"] = async (ids, patch) => {
    setVariants((list) =>
      list.map((v) => (ids.includes(v.id) ? { ...v, ...patch, updatedAt: new Date().toISOString() } : v)),
    );
    const isShallow = Object.keys(patch).every((k) => SHALLOW_KEYS.has(k as keyof CardVariant));
    try {
      if (isShallow) {
        const dbPatch: Parameters<typeof patchVariantShallow>[1] = {};
        if (patch.status !== undefined) {
          dbPatch.status = patch.status;
          dbPatch.is_hidden = patch.status === "hidden";
          dbPatch.is_archived = patch.status === "archived";
        }
        if (patch.isNew !== undefined) dbPatch.is_new = patch.isNew;
        if (patch.isPopular !== undefined) dbPatch.is_popular = patch.isPopular;
        if (patch.isRecommended !== undefined) dbPatch.is_recommended = patch.isRecommended;
        if (patch.allowSharing !== undefined) dbPatch.allow_sharing = patch.allowSharing;
        if (patch.allowDownloading !== undefined) dbPatch.allow_downloading = patch.allowDownloading;
        await Promise.all(ids.map((id) => patchVariantShallow(id, dbPatch)));
      } else {
        // Fall back to sequential full upserts
        for (const id of ids) {
          const cur = variantsRef.current.find((v) => v.id === id);
          if (!cur) continue;
          const merged = { ...cur, ...patch } as CardVariant;
          if (!slugIdsRef.current) slugIdsRef.current = await ensureTaxonomyForLocal(DEFAULT_TAXONOMY);
          await upsertVariant(id, localToPayload(merged), slugIdsRef.current);
        }
        await refresh();
      }
    } catch (e) {
      console.error(e);
      toast.error("Bulk update failed");
      await refresh();
    }
  };

  // Taxonomy ops
  const addTaxonomy: Ctx["addTaxonomy"] = async (kind, item) => {
    setTaxonomy((tx) => ({ ...tx, [kind]: [...tx[kind], item] }));
    const dbKind = LOCAL_TAX_KIND[kind];
    if (!dbKind) return;
    try {
      const id = await insertTaxonomyItemDb(dbKind, item);
      if (id && slugIdsRef.current) slugIdsRef.current[dbKind].set(item.key, id);
    } catch (e) {
      console.error(e);
      toast.error("Save failed");
    }
  };
  const updateTaxonomy: Ctx["updateTaxonomy"] = async (kind, key, patch) => {
    setTaxonomy((tx) => ({
      ...tx,
      [kind]: tx[kind].map((i) => (i.key === key ? { ...i, ...patch } : i)),
    }));
    const dbKind = LOCAL_TAX_KIND[kind];
    const id = dbKind ? slugIdsRef.current?.[dbKind].get(key) : undefined;
    if (!dbKind || !id) return;
    try {
      await updateTaxonomyItemDb(dbKind, id, patch);
    } catch (e) {
      console.error(e);
      toast.error("Save failed");
    }
  };
  const taxonomyUsage: Ctx["taxonomyUsage"] = (kind, key) => {
    let n = 0;
    for (const v of variants) {
      switch (kind) {
        case "occasion":
          if (v.primaryOccasion === key || v.additionalOccasions.includes(key)) n += 1;
          break;
        case "recipient":
          if (v.recipients.includes(key)) n += 1;
          break;
        case "style":
          if (v.styles.includes(key)) n += 1;
          break;
        case "mood":
          if (v.mood.includes(key)) n += 1;
          break;
        case "visualObject":
          if (v.visualObjects.includes(key)) n += 1;
          break;
        case "ageGroup":
          if (v.ageGroup === key) n += 1;
          break;
        case "orientation":
          if (v.orientation === key) n += 1;
          break;
      }
    }
    if (kind === "style" || kind === "visualObject" || kind === "mood" || kind === "orientation") {
      for (const b of backgrounds) {
        if (kind === "style" && b.visualStyles.includes(key)) n += 1;
        else if (kind === "visualObject" && b.visualObjects.includes(key)) n += 1;
        else if (kind === "mood" && b.mood.includes(key)) n += 1;
        else if (kind === "orientation" && b.orientation === key) n += 1;
      }
    }
    return n;
  };
  const deleteTaxonomy: Ctx["deleteTaxonomy"] = async (kind, key) => {
    const usage = taxonomyUsage(kind, key);
    if (usage > 0) return { ok: false, usage };
    setTaxonomy((tx) => ({ ...tx, [kind]: tx[kind].filter((i) => i.key !== key) }));
    const dbKind = LOCAL_TAX_KIND[kind];
    const id = dbKind ? slugIdsRef.current?.[dbKind].get(key) : undefined;
    if (dbKind && id) {
      try {
        await deleteTaxonomyItemDb(dbKind, id);
        slugIdsRef.current?.[dbKind].delete(key);
      } catch (e) {
        console.error(e);
        toast.error("Delete failed");
      }
    }
    return { ok: true, usage: 0 };
  };
  const reorderTaxonomy: Ctx["reorderTaxonomy"] = async (kind, keys) => {
    setTaxonomy((tx) => {
      const byKey = new Map(tx[kind].map((i) => [i.key, i]));
      const next: TaxonomyItem[] = [];
      keys.forEach((k, idx) => {
        const it = byKey.get(k);
        if (it) next.push({ ...it, displayOrder: idx + 1 });
      });
      for (const it of tx[kind]) if (!keys.includes(it.key)) next.push(it);
      return { ...tx, [kind]: next };
    });
    const dbKind = LOCAL_TAX_KIND[kind];
    if (!dbKind || !slugIdsRef.current) return;
    const ids = keys
      .map((k) => slugIdsRef.current![dbKind].get(k))
      .filter((v): v is string => Boolean(v));
    try {
      await reorderTaxonomyItemsDb(dbKind, ids);
    } catch (e) {
      console.error(e);
      toast.error("Save failed");
    }
  };

  const value = useMemo<Ctx>(
    () => ({
      backgrounds,
      variants,
      taxonomy,
      loading,
      refresh,
      addBackground,
      updateBackground,
      deleteBackground,
      duplicateBackground,
      addVariant,
      updateVariant,
      deleteVariant,
      duplicateVariant,
      bulkUpdateVariants,
      variantsUsingBackground,
      getBackground,
      getVariant,
      addTaxonomy,
      updateTaxonomy,
      deleteTaxonomy,
      reorderTaxonomy,
      taxonomyUsage,
      t,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [backgrounds, variants, taxonomy, loading, t],
  );

  return <CatalogMgmtCtx.Provider value={value}>{children}</CatalogMgmtCtx.Provider>;
}

export function useCatalogMgmt() {
  const ctx = useContext(CatalogMgmtCtx);
  if (!ctx) throw new Error("useCatalogMgmt must be used inside CatalogMgmtProvider");
  return ctx;
}

// Helpers exposed for reuse in components
export { defaultTextDesign, emptyTranslation, translationCompleteness };
export type { TextDesign };