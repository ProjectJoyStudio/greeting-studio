import { describe, expect, it } from "vitest";

import { DEFAULT_TEXT_DESIGN } from "@/lib/greeting-card/types";
import { layoutGreeting, SAFE_MARGIN, validateGreetingLayout } from "./text-render";

const samples = {
  ru: "Пусть каждый новый день приносит радость и вдохновение.\nЖелаю крепкого здоровья, душевного тепла и исполнения самых заветных желаний.",
  uk: "Нехай кожен новий день дарує радість і натхнення.\nБажаю міцного здоров’я, щирого тепла та здійснення найзаповітніших мрій.",
  de: "Möge jeder neue Tag Freude und Inspiration bringen.\nIch wünsche dir Gesundheit, Herzenswärme und die Erfüllung deiner schönsten Wünsche.",
  en: "May every new day bring happiness and inspiration.\nWishing you health, warmth, wonderful memories, and the fulfillment of your dearest dreams.",
};

// Deterministic Unicode-aware approximation used to test geometry without a
// browser Canvas. Production uses the selected browser font's real metrics.
const measurer = {
  font: "",
  measureText(value: string) {
    const px = Number.parseFloat(this.font) || 16;
    return { width: Array.from(value).length * px * 0.58 } as TextMetrics;
  },
};

describe.each(Object.entries(samples))("live greeting layout (%s)", (_language, text) => {
  it("wraps and auto-fits once without overlapping or leaving the safe area", () => {
    const requestedFontPx = 12 / 100 * 720;
    const layout = layoutGreeting(
      720,
      720,
      text,
      { ...DEFAULT_TEXT_DESIGN, fontSize: 12, width: 48, background: true },
      measurer,
    );

    expect(layout).not.toBeNull();
    if (!layout) return;
    expect(layout.lines.length).toBeGreaterThan(2);
    expect(layout.fontPx).toBeLessThan(requestedFontPx);
    expect(layout.lineHeight).toBeGreaterThanOrEqual(layout.fontPx * 1.15);
    expect(layout.blockHeight).toBeCloseTo(layout.lines.length * layout.lineHeight);
    expect(validateGreetingLayout(720, 720, layout)).toEqual({ valid: true });

    const margin = 720 * SAFE_MARGIN / 100;
    expect(layout.box.left).toBeGreaterThanOrEqual(margin - 1);
    expect(layout.box.top).toBeGreaterThanOrEqual(margin - 1);
    expect(layout.box.left + layout.box.width).toBeLessThanOrEqual(720 - margin + 1);
    expect(layout.box.top + layout.box.height).toBeLessThanOrEqual(720 - margin + 1);
  });
});

it("splits one very long Unicode word without cutting code points", () => {
  const text = "Надзвичайнодовгепривітаннябезпробілівдляперевіркиперенесення";
  const layout = layoutGreeting(
    720,
    720,
    text,
    { ...DEFAULT_TEXT_DESIGN, width: 25 },
    measurer,
  );
  expect(layout?.lines.length).toBeGreaterThan(1);
  expect(layout?.lines.join("")).toBe(text);
});