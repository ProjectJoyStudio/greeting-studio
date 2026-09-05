// Shared, client-safe types for the Greeting Card workflow.

export type GreetingMode = "manual" | "keywords";

export interface CardTextDesign {
  fontFamily: string;
  fontSize: number; // % of image width
  color: string;
  x: number; // 0..100 (% of width, centre of the text block)
  y: number; // 0..100 (% of height, centre of the text block)
  width: number; // 0..100 (% of width)
  align: "left" | "center" | "right";
  shadow: boolean;
  /** Thin contrasting outline around every glyph. */
  outline: boolean;
  outlineColor: string;
  background: boolean;
  backgroundColor: string;
  backgroundOpacity: number; // 0..1
}

export const DEFAULT_TEXT_DESIGN: CardTextDesign = {
  fontFamily: "'Fraunces', Georgia, serif",
  fontSize: 5.5,
  color: "#ffffff",
  x: 50,
  y: 78,
  width: 80,
  align: "center",
  shadow: true,
  outline: false,
  outlineColor: "#000000",
  background: false,
  backgroundColor: "#000000",
  backgroundOpacity: 0.35,
};

export const CARD_FONTS: { value: string; label: string }[] = [
  { value: "'Fraunces', Georgia, serif", label: "Fraunces" },
  { value: "'Inter', system-ui, sans-serif", label: "Inter" },
  { value: "Georgia, 'Times New Roman', serif", label: "Georgia" },
  { value: "'Trebuchet MS', sans-serif", label: "Trebuchet" },
  { value: "'Courier New', monospace", label: "Courier" },
  // Handwritten options. Both cover Latin and Cyrillic; the fallbacks keep any
  // character the font itself does not carry readable instead of showing boxes.
  { value: "'Caveat', 'Segoe Script', 'Bradley Hand', cursive", label: "Caveat" },
  { value: "'Bad Script', 'Segoe Script', 'Bradley Hand', cursive", label: "Bad Script" },
  // Great Vibes carries Latin only; the Cyrillic-capable fallbacks keep Russian
  // and Ukrainian text readable instead of showing boxes.
  { value: "'Great Vibes', 'Marck Script', 'Segoe Script', cursive", label: "Great Vibes" },
  { value: "'Lobster', 'Trebuchet MS', cursive", label: "Lobster" },
  { value: "'Marck Script', 'Segoe Script', cursive", label: "Marck Script" },
  { value: "'Playfair', 'Playfair Display', Georgia, serif", label: "Playfair" },
];

export function normalizeTextDesign(value: unknown): CardTextDesign {
  if (!value || typeof value !== "object") return { ...DEFAULT_TEXT_DESIGN };
  const v = value as Partial<CardTextDesign>;
  return {
    ...DEFAULT_TEXT_DESIGN,
    ...Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined && x !== null)),
  } as CardTextDesign;
}

export interface UserGreetingCard {
  id: string;
  status: string;
  prompt: string;
  keywords: string[];
  greetingMode: GreetingMode;
  greetingText: string;
  storageBucket: string;
  storagePath: string;
  textDesign: CardTextDesign;
  createdAt: string;
  /** Signed, renderable URL resolved at read time. */
  imageUrl?: string | null;
}

export interface AdminUserDraft {
  id: string;
  userId: string | null;
  userEmail: string | null;
  prompt: string;
  greetingText: string;
  keywords: string[];
  createdAt: string;
  imageUrl: string | null;
}