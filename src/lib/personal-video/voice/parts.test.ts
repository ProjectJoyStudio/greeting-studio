import { describe, expect, it } from "vitest";
import {
  speechBudgetSeconds,
  splitGreeting,
  PVG_MIN_PART_GAP_SECONDS,
} from "@/lib/personal-video/voice/speech";

describe("parts mode budget", () => {
  it("reserves half a second at both ends", () => {
    expect(speechBudgetSeconds(5)).toBe(4);
    expect(speechBudgetSeconds(10)).toBe(9);
    expect(speechBudgetSeconds(15)).toBe(14);
    expect(speechBudgetSeconds(60)).toBe(59);
    expect(speechBudgetSeconds(0)).toBe(0);
  });
  it("gives every participant words for 1-5 people", () => {
    const text =
      "Happy birthday, dear Anna. We wish you joy. May your year shine. Big hugs from all of us. See you soon!";
    for (let n = 1; n <= 5; n += 1) {
      const parts = splitGreeting(text, n);
      expect(parts).toHaveLength(n);
      parts.forEach((p) => expect(p.trim().length).toBeGreaterThan(0));
    }
  });
  it("keeps pauses short", () => {
    expect(PVG_MIN_PART_GAP_SECONDS).toBeLessThanOrEqual(0.05);
  });
});
