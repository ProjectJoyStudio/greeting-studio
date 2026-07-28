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
  /** i18n key of the visible caption. */
  captionKey: string;
  /** Warm gradient used as the lightweight thumbnail. */
  thumb: string;
  /** Loaded only after the visitor presses "View". */
  videoUrl?: string;
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
  items: ShowcaseItem[];
}

const g = (a: string, b: string) => `linear-gradient(150deg, ${a}, ${b})`;

export const SHOWCASE: ShowcaseCategory[] = [
  {
    id: "cards",
    titleKey: "sc_cards",
    createKey: "sc_create_card",
    gift: "card",
    items: [
      { id: "card-1", captionKey: "cat_birthday", thumb: g("oklch(0.92 0.07 80)", "oklch(0.7 0.13 50)") },
      { id: "card-2", captionKey: "cat_love", thumb: g("oklch(0.88 0.09 20)", "oklch(0.55 0.15 15)") },
      { id: "card-3", captionKey: "cat_wedding", thumb: g("oklch(0.94 0.05 340)", "oklch(0.7 0.11 340)") },
    ],
  },
  {
    id: "animated",
    titleKey: "sc_animated",
    createKey: "sc_create_animated",
    gift: "animated",
    items: [
      { id: "anim-1", captionKey: "cat_holiday", thumb: g("oklch(0.9 0.09 90)", "oklch(0.62 0.14 60)") },
      { id: "anim-2", captionKey: "cat_congrats", thumb: g("oklch(0.9 0.1 75)", "oklch(0.6 0.16 55)") },
    ],
  },
  {
    id: "video",
    titleKey: "sc_video",
    createKey: "sc_create_video",
    gift: "video-greeting",
    items: [
      { id: "vid-1", captionKey: "cat_birthday", thumb: g("oklch(0.86 0.07 220)", "oklch(0.5 0.11 225)") },
      { id: "vid-2", captionKey: "cat_thanks", thumb: g("oklch(0.88 0.07 150)", "oklch(0.5 0.11 160)") },
    ],
  },
  {
    id: "clip",
    titleKey: "sc_clip",
    createKey: "sc_create_clip",
    gift: "video-clip",
    items: [
      { id: "clip-1", captionKey: "cat_love", thumb: g("oklch(0.8 0.1 330)", "oklch(0.45 0.13 320)") },
      { id: "clip-2", captionKey: "cat_anniversary", thumb: g("oklch(0.85 0.08 40)", "oklch(0.48 0.12 25)") },
    ],
  },
  {
    id: "cartoon",
    titleKey: "sc_cartoon",
    createKey: "sc_create_cartoon",
    gift: "cartoon",
    items: [
      { id: "toon-1", captionKey: "cat_newborn", thumb: g("oklch(0.92 0.06 220)", "oklch(0.72 0.1 205)") },
      { id: "toon-2", captionKey: "cat_kids", thumb: g("oklch(0.93 0.08 120)", "oklch(0.68 0.13 140)") },
    ],
  },
  {
    id: "corporate",
    titleKey: "sc_corporate",
    createKey: "sc_create_corporate",
    gift: "premium",
    items: [
      { id: "corp-1", captionKey: "cat_corporate", thumb: g("oklch(0.6 0.07 265)", "oklch(0.32 0.08 265)") },
      { id: "corp-2", captionKey: "cat_holiday", thumb: g("oklch(0.55 0.09 30)", "oklch(0.3 0.08 20)") },
    ],
  },
  {
    id: "premium",
    titleKey: "sc_premium",
    createKey: "sc_create_premium",
    gift: "premium",
    items: [
      { id: "prem-1", captionKey: "cat_wedding", thumb: g("oklch(0.9 0.1 85)", "oklch(0.55 0.15 45)") },
      { id: "prem-2", captionKey: "cat_anniversary", thumb: g("oklch(0.82 0.09 350)", "oklch(0.42 0.12 340)") },
    ],
  },
];
