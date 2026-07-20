import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useI18n } from "@/lib/i18n";
import type {
  Background,
  CardVariant,
  Taxonomy,
  TaxonomyItem,
  TaxonomyKind,
  Translation,
  TextDesign,
} from "./types";
import { defaultTextDesign, emptyTranslation, translationCompleteness } from "./types";
import { DEFAULT_TAXONOMY } from "./taxonomy";
import { MOCK_BACKGROUNDS, MOCK_VARIANTS } from "./mock-data";
import { cmT } from "./i18n";

interface Ctx {
  backgrounds: Background[];
  variants: CardVariant[];
  taxonomy: Taxonomy;
  // background ops
  addBackground: (b: Omit<Background, "id" | "createdAt" | "updatedAt">) => Background;
  updateBackground: (id: string, patch: Partial<Background>) => void;
  deleteBackground: (id: string) => boolean;
  duplicateBackground: (id: string) => Background | null;
  // variant ops
  addVariant: (v: Omit<CardVariant, "id" | "createdAt" | "updatedAt">) => CardVariant;
  updateVariant: (id: string, patch: Partial<CardVariant>) => void;
  deleteVariant: (id: string) => void;
  duplicateVariant: (id: string) => CardVariant | null;
  bulkUpdateVariants: (ids: string[], patch: Partial<CardVariant>) => void;
  variantsUsingBackground: (bgId: string) => CardVariant[];
  getBackground: (id: string) => Background | undefined;
  getVariant: (id: string) => CardVariant | undefined;
  // taxonomy ops
  addTaxonomy: (kind: TaxonomyKind, item: TaxonomyItem) => void;
  updateTaxonomy: (kind: TaxonomyKind, key: string, patch: Partial<TaxonomyItem>) => void;
  deleteTaxonomy: (kind: TaxonomyKind, key: string) => { ok: boolean; usage: number };
  reorderTaxonomy: (kind: TaxonomyKind, keys: string[]) => void;
  taxonomyUsage: (kind: TaxonomyKind, key: string) => number;
  t: (k: string) => string;
}

const CatalogMgmtCtx = createContext<Ctx | null>(null);

let idSeq = 1000;
function nextId(prefix: string) {
  idSeq += 1;
  return `${prefix}-${idSeq}`;
}

export function CatalogMgmtProvider({ children }: { children: ReactNode }) {
  const { lang } = useI18n();
  const t = useCallback((k: string) => cmT(lang, k), [lang]);

  const [backgrounds, setBackgrounds] = useState<Background[]>(() => [...MOCK_BACKGROUNDS]);
  const [variants, setVariants] = useState<CardVariant[]>(() => [...MOCK_VARIANTS]);
  const [taxonomy, setTaxonomy] = useState<Taxonomy>(() => structuredClone(DEFAULT_TAXONOMY));

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

  const addBackground: Ctx["addBackground"] = (b) => {
    const now = new Date().toISOString();
    const item: Background = { ...b, id: nextId("BG"), createdAt: now, updatedAt: now };
    setBackgrounds((list) => [item, ...list]);
    return item;
  };
  const updateBackground: Ctx["updateBackground"] = (id, patch) => {
    setBackgrounds((list) =>
      list.map((b) => (b.id === id ? { ...b, ...patch, updatedAt: new Date().toISOString() } : b)),
    );
  };
  const deleteBackground: Ctx["deleteBackground"] = (id) => {
    if (variantsUsingBackground(id).length > 0) return false;
    setBackgrounds((list) => list.filter((b) => b.id !== id));
    return true;
  };
  const duplicateBackground: Ctx["duplicateBackground"] = (id) => {
    const src = getBackground(id);
    if (!src) return null;
    return addBackground({
      ...src,
      internalName: `${src.internalName}-copy`,
      status: "draft",
    });
  };

  const addVariant: Ctx["addVariant"] = (v) => {
    const now = new Date().toISOString();
    const item: CardVariant = { ...v, id: nextId("CV"), createdAt: now, updatedAt: now };
    setVariants((list) => [item, ...list]);
    return item;
  };
  const updateVariant: Ctx["updateVariant"] = (id, patch) => {
    setVariants((list) =>
      list.map((v) => (v.id === id ? { ...v, ...patch, updatedAt: new Date().toISOString() } : v)),
    );
  };
  const deleteVariant: Ctx["deleteVariant"] = (id) => {
    setVariants((list) => list.filter((v) => v.id !== id));
  };
  const duplicateVariant: Ctx["duplicateVariant"] = (id) => {
    const src = getVariant(id);
    if (!src) return null;
    // Deep copy translations
    const translations: Partial<Record<string, Translation>> = {};
    for (const [k, tv] of Object.entries(src.translations)) {
      if (tv) translations[k] = { ...tv, searchKeywords: [...tv.searchKeywords] };
    }
    return addVariant({
      ...src,
      internalName: `${src.internalName}-copy`,
      translations: translations as CardVariant["translations"],
      textDesign: { ...src.textDesign },
      status: "draft",
      isNew: true,
      isPopular: false,
      isRecommended: false,
    });
  };
  const bulkUpdateVariants: Ctx["bulkUpdateVariants"] = (ids, patch) => {
    setVariants((list) =>
      list.map((v) =>
        ids.includes(v.id) ? { ...v, ...patch, updatedAt: new Date().toISOString() } : v,
      ),
    );
  };

  // Taxonomy ops
  const addTaxonomy: Ctx["addTaxonomy"] = (kind, item) => {
    setTaxonomy((tx) => ({ ...tx, [kind]: [...tx[kind], item] }));
  };
  const updateTaxonomy: Ctx["updateTaxonomy"] = (kind, key, patch) => {
    setTaxonomy((tx) => ({
      ...tx,
      [kind]: tx[kind].map((i) => (i.key === key ? { ...i, ...patch } : i)),
    }));
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
  const deleteTaxonomy: Ctx["deleteTaxonomy"] = (kind, key) => {
    const usage = taxonomyUsage(kind, key);
    if (usage > 0) return { ok: false, usage };
    setTaxonomy((tx) => ({ ...tx, [kind]: tx[kind].filter((i) => i.key !== key) }));
    return { ok: true, usage: 0 };
  };
  const reorderTaxonomy: Ctx["reorderTaxonomy"] = (kind, keys) => {
    setTaxonomy((tx) => {
      const byKey = new Map(tx[kind].map((i) => [i.key, i]));
      const next: TaxonomyItem[] = [];
      keys.forEach((k, idx) => {
        const it = byKey.get(k);
        if (it) next.push({ ...it, displayOrder: idx + 1 });
      });
      // append any missing
      for (const it of tx[kind]) if (!keys.includes(it.key)) next.push(it);
      return { ...tx, [kind]: next };
    });
  };

  const value = useMemo<Ctx>(
    () => ({
      backgrounds,
      variants,
      taxonomy,
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
    [backgrounds, variants, taxonomy, t],
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