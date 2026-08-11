import { describe, expect, it } from "vitest";

import { greetingFit, safeWordLimit, safeWordLimitForSpeech } from "../video-setup";
import { estimateVideoSeconds, PVG_DEFAULT_SECONDS_PER_WORD } from "./speech";

describe("one safe word limit everywhere", () => {
  it("grows by one word per second of video", () => {
    expect(safeWordLimit(5)).toBe(7);
    expect(safeWordLimit(6)).toBe(8);
    expect(safeWordLimit(7)).toBe(9);
    expect(safeWordLimit(10)).toBe(12);
  });

  it("matches the limit seen from the speaking time", () => {
    expect(safeWordLimitForSpeech(4)).toBe(7);
    expect(safeWordLimitForSpeech(9)).toBe(12);
  });

  it("never calls a greeting within the limit too short", () => {
    for (const [seconds, words] of [
      [5, 7],
      [6, 8],
      [7, 9],
      [10, 12],
    ] as const) {
      const text = Array.from({ length: words }, () => "word").join(" ");
      expect(greetingFit(text, seconds).state).toBe("ok");
      expect(greetingFit(`${text} word`, seconds).state).toBe("long");
    }
  });

  it("estimates a greeting at the limit inside the video length", () => {
    for (const [seconds, words] of [
      [5, 7],
      [6, 8],
      [7, 9],
      [10, 12],
    ] as const) {
      const parts = [{ words, secondsPerWord: PVG_DEFAULT_SECONDS_PER_WORD }];
      expect(estimateVideoSeconds(parts)).toBeLessThanOrEqual(seconds);
    }
  });
});
