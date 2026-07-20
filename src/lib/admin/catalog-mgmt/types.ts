// ---------------------------------------------------------------------------
// Project Joy — Catalog Management (frontend mock).
// Public catalog is FREE. No prices, no credits, no personal names.
// These types are structured to map cleanly onto a future Supabase schema.
// ---------------------------------------------------------------------------

import type { Lang } from "@/lib/i18n";

export type Orientation = "vertical" | "square" | "horizontal";

export type BackgroundStatus = "draft" | "active" | "hidden" | "archived";
export type VariantStatus = "draft" | "review" | "published" | "hidden" | "archived";

export interface Background {
  id: string;
  internalName: string;
  sourceImageUrl: string; // placeholder — filename or data URL
  thumbnailUrl: string;
  orientation: Orientation;
  aspectRatio: string; // e.g. "4:5", "1:1", "16:9"
  visualStyles: string[]; // taxonomy keys
  visualObjects: string[]; // free tag keys
  mood: string[];
  status: BackgroundStatus;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
  // demo-only placeholder gradient index when no image is uploaded
  gradientIndex?: number;
}

export interface TextDesign {
  x: number; // percent 0-100 (top-left of text box)
  y: number;
  width: number; // percent width
  alignment: "left" | "center" | "right";
  fontFamily: string;
  fontSize: number; // px at design ref
  fontWeight: number;
  lineHeight: number;
  textColor: string;
  textShadow: boolean;
  backgroundOverlay: number; // 0-100 opacity of translucent overlay behind text
  rotation: number; // degrees
  maxLines: number;
}

export interface Translation {
  locale: Lang;
  catalogTitle: string;
  shortDescription: string;
  textOnCard: string;
  searchKeywords: string[];
  // Optional per-language text design override
  textDesignOverride?: Partial<TextDesign>;
}

export type TranslationCompleteness = "complete" | "incomplete" | "missing";

export interface CardVariant {
  id: string;
  backgroundId: string;
  internalName: string;
  primaryOccasion: string;
  additionalOccasions: string[];
  recipients: string[];
  styles: string[];
  visualObjects: string[];
  mood: string[];
  ageGroup: string;
  orientation: Orientation;
  translations: Partial<Record<Lang, Translation>>;
  textDesign: TextDesign;
  displayOrder: number;
  isNew: boolean;
  isPopular: boolean;
  isRecommended: boolean;
  allowSharing: boolean;
  allowDownloading: boolean;
  status: VariantStatus;
  publishAt?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaxonomyItem {
  key: string; // internal, snake_case
  names: Partial<Record<Lang, string>>;
  icon?: string; // emoji fallback
  coverImageUrl?: string;
  displayOrder: number;
  active: boolean;
  parentKey?: string;
}

export type TaxonomyKind =
  | "occasion"
  | "recipient"
  | "style"
  | "mood"
  | "visualObject"
  | "ageGroup"
  | "orientation";

export interface Taxonomy {
  occasion: TaxonomyItem[];
  recipient: TaxonomyItem[];
  style: TaxonomyItem[];
  mood: TaxonomyItem[];
  visualObject: TaxonomyItem[];
  ageGroup: TaxonomyItem[];
  orientation: TaxonomyItem[];
}

export function defaultTextDesign(): TextDesign {
  return {
    x: 10,
    y: 70,
    width: 80,
    alignment: "center",
    fontFamily: "Fraunces",
    fontSize: 42,
    fontWeight: 600,
    lineHeight: 1.2,
    textColor: "#ffffff",
    textShadow: true,
    backgroundOverlay: 25,
    rotation: 0,
    maxLines: 3,
  };
}

export function emptyTranslation(locale: Lang): Translation {
  return {
    locale,
    catalogTitle: "",
    shortDescription: "",
    textOnCard: "",
    searchKeywords: [],
  };
}

export function translationCompleteness(t: Translation | undefined): TranslationCompleteness {
  if (!t) return "missing";
  const has = (s: string) => s.trim().length > 0;
  const flags = [has(t.catalogTitle), has(t.textOnCard), has(t.shortDescription)];
  const n = flags.filter(Boolean).length;
  if (n === 0) return "missing";
  if (n === flags.length) return "complete";
  return "incomplete";
}

// Placeholder gradients when no image is uploaded — reuses existing look.
export const CATALOG_MGMT_GRADIENTS = [
  "linear-gradient(160deg, oklch(0.9 0.09 55), oklch(0.6 0.15 30))",
  "linear-gradient(160deg, oklch(0.86 0.11 20), oklch(0.5 0.15 10))",
  "linear-gradient(160deg, oklch(0.9 0.08 90), oklch(0.6 0.13 65))",
  "linear-gradient(160deg, oklch(0.85 0.08 340), oklch(0.5 0.12 340))",
  "linear-gradient(160deg, oklch(0.88 0.09 150), oklch(0.5 0.11 165))",
  "linear-gradient(160deg, oklch(0.85 0.07 240), oklch(0.4 0.09 260))",
  "linear-gradient(160deg, oklch(0.9 0.07 45), oklch(0.42 0.11 30))",
  "linear-gradient(160deg, oklch(0.88 0.1 75), oklch(0.55 0.14 55))",
];

export function backgroundBg(bg: Background | undefined): string {
  if (!bg) return CATALOG_MGMT_GRADIENTS[0];
  if (bg.sourceImageUrl) return `url(${bg.sourceImageUrl}) center/cover no-repeat`;
  const idx = (bg.gradientIndex ?? 0) % CATALOG_MGMT_GRADIENTS.length;
  return CATALOG_MGMT_GRADIENTS[idx];
}