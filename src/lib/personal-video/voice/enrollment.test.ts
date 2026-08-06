import { describe, expect, it } from "vitest";
import { enrollmentTexts } from "./enrollment";

const LANGUAGES = ["en", "ru", "de", "uk", "fr", "pl"];

describe("enrollmentTexts", () => {
  for (const language of LANGUAGES) {
    it(`gives ${language} exactly two short samples`, () => {
      const texts = enrollmentTexts(language);
      expect(texts).toHaveLength(2);
      for (const entry of texts) {
        expect(entry.words).toBeGreaterThan(0);
        expect(entry.words).toBeLessThanOrEqual(15);
      }
    });
  }

  it("falls back to English for an unknown language", () => {
    expect(enrollmentTexts("xx")).toEqual(enrollmentTexts("en"));
  });
});
