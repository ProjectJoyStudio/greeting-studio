import { describe, expect, it } from "vitest";
import { viewerStartPage } from "./viewer-position";

describe("reader position across engine replacement", () => {
  it("keeps the first spread instead of restarting at the cover", () => {
    expect(viewerStartPage(1, 12, false)).toBe(1);
  });
  it("keeps every spread of the 5-leaf and 15-leaf books", () => {
    for (const count of [12, 32]) {
      for (let page = 1; page < count - 1; page += 2) {
        expect(viewerStartPage(page, count, false)).toBe(page);
      }
    }
  });
  it("maps a portrait right-hand page to its spread without changing saved order", () => {
    expect(viewerStartPage(8, 32, false)).toBe(7);
    expect(viewerStartPage(8, 32, true)).toBe(8);
  });
  it("keeps both covers and bounds a removed face", () => {
    expect(viewerStartPage(0, 12, false)).toBe(0);
    expect(viewerStartPage(11, 12, false)).toBe(11);
    expect(viewerStartPage(31, 12, true)).toBe(11);
  });
});