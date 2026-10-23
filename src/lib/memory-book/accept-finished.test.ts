import { describe, expect, it } from "vitest";
import { canAcceptAsFinished } from "./materials";

describe("Use as finished duration rule", () => {
  it("allows a 2-minute video", () => expect(canAcceptAsFinished(120)).toBe(true));
  it("allows exactly 5 minutes", () => expect(canAcceptAsFinished(300)).toBe(true));
  it("rejects an 8-minute video", () => expect(canAcceptAsFinished(480)).toBe(false));
  it("rejects unknown duration", () => expect(canAcceptAsFinished(null)).toBe(false));
});
