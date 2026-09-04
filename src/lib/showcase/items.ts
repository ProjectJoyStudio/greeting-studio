// ---------------------------------------------------------------------------
// Showcase content registry — "What Project Joy Can Create".
//
// Official Project Joy demonstration content only. Customer work may be added
// here ONLY when the customer has explicitly granted permission (set
// `permissionGranted: true` and credit them in `credit`).
//
// To refresh the page, swap the items below. The page structure never changes.
// Keep each category to a few of the best examples: this page must stay light.
// ---------------------------------------------------------------------------
import type { StudioGiftId } from "@/lib/studio/pricing";

export interface ShowcaseItem {
  id: string;
  /** Internal-only label (admin lists, alt text). Never rendered as a card title. */
  altKey?: string;
  /** Warm gradient used as the lightweight thumbnail. */
  thumb: string;
  /** Future admin upload: still image preview replacing the gradient. */
  imageUrl?: string;
  /** Loaded only after the visitor presses "View". */
  videoUrl?: string;
  /** Admin-managed: hidden items are never rendered publicly. */
  hidden?: boolean;
  /** Admin-managed display order inside its category (ascending). */
  sortOrder?: number;
  /** Only true for customer work with explicit written permission. */
  permissionGranted?: boolean;
  credit?: string;
}

export interface ShowcaseCategory {
  id: string;
  /** i18n key of the category title. */
  titleKey: string;
  /** i18n key of the "Create ..." button. */
  createKey: string;
  /** Studio product preselected when the create button is pressed. */
  gift: StudioGiftId;
  /** Optional direct destination replacing the Studio link. */
  to?: string;
  /** Admin-managed order of the category blocks (ascending). */
  sortOrder?: number;
  hidden?: boolean;
  items: ShowcaseItem[];
}


const g = (a: string, b: string) => `linear-gradient(150deg, ${a}, ${b})`;

/** Visible items for a category, in admin-defined order. */
export function visibleItems(cat: ShowcaseCategory): ShowcaseItem[] {
  return cat.items
    .filter((i) => !i.hidden)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

/** Visible categories, in admin-defined order. */
export function visibleCategories(cats: ShowcaseCategory[]): ShowcaseCategory[] {
  return cats.filter((c) => !c.hidden).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export const SHOWCASE: ShowcaseCategory[] = [
  {
    id: "cards",
    titleKey: "sc_cards",
    createKey: "sc_create_card",
    gift: "card",
    items: [
      { id: "card-1", altKey: "cat_birthday", thumb: g("oklch(0.92 0.07 80)", "oklch(0.7 0.13 50)") },
      { id: "card-2", altKey: "cat_love", thumb: g("oklch(0.88 0.09 20)", "oklch(0.55 0.15 15)") },
      { id: "card-3", altKey: "cat_wedding", thumb: g("oklch(0.94 0.05 340)", "oklch(0.7 0.11 340)") },
    ],
  },
  {
    id: "animated",
    titleKey: "sc_animated",
    createKey: "sc_create_animated",
    gift: "animated",
    items: [
      { id: "anim-1", altKey: "cat_holiday", thumb: g("oklch(0.9 0.09 90)", "oklch(0.62 0.14 60)") },
      { id: "anim-2", altKey: "cat_congrats", thumb: g("oklch(0.9 0.1 75)", "oklch(0.6 0.16 55)") },
    ],
  },
  {
    id: "video",
    titleKey: "sc_video",
    createKey: "sc_create_video",
    gift: "video-greeting",
    items: [
      { id: "vid-1", altKey: "cat_birthday", thumb: g("oklch(0.86 0.07 220)", "oklch(0.5 0.11 225)") },
      { id: "vid-2", altKey: "cat_thanks", thumb: g("oklch(0.88 0.07 150)", "oklch(0.5 0.11 160)") },
    ],
  },
];
