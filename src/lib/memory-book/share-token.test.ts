import { describe, expect, it } from "vitest";
import { isValidShareToken, newShareToken } from "./share-token";

describe("memory book share tokens", () => {
  it("every new link gets a different well-formed token", () => {
    const tokens = new Set(Array.from({ length: 200 }, () => newShareToken()));
    expect(tokens.size).toBe(200);
    for (const t of tokens) expect(isValidShareToken(t)).toBe(true);
  });
  it("a plain book ID is never accepted as a share token", () => {
    expect(isValidShareToken("8ce42f28-414a-4c21-ae45-3eddaf2d418a")).toBe(false);
    expect(isValidShareToken("")).toBe(false);
  });
});
