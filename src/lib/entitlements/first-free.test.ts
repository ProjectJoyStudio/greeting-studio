import { describe, expect, it } from "vitest";

import {
  FIRST_FREE_ELIGIBLE_PRODUCTS,
  firstFreeErrorKey,
  isFirstFreeEligibleProduct,
  sanitizeRedirect,
} from "./first-free";

describe("eligible products", () => {
  it("allows exactly greeting card and animated greeting", () => {
    expect([...FIRST_FREE_ELIGIBLE_PRODUCTS]).toEqual(["card", "animated"]);
  });

  it("rejects every premium / high-cost product", () => {
    for (const p of ["video-greeting", "video-clip", "cartoon", "premium", "song", "fairy-tale", "corporate"]) {
      expect(isFirstFreeEligibleProduct(p)).toBe(false);
    }
  });

  it("rejects tampered payloads", () => {
    expect(isFirstFreeEligibleProduct(undefined)).toBe(false);
    expect(isFirstFreeEligibleProduct({ productType: "card" })).toBe(false);
    expect(isFirstFreeEligibleProduct("CARD")).toBe(false);
  });
});

describe("server error mapping", () => {
  it("maps the second attempt (already used) to a localized message", () => {
    expect(firstFreeErrorKey("already_used")).toBe("ff_err_already_used");
  });
  it("maps a modified request with a video clip to the product message", () => {
    expect(firstFreeErrorKey("product_not_eligible")).toBe("ff_err_product");
  });
  it("maps a signed-out attempt to the auth message", () => {
    expect(firstFreeErrorKey("not_authenticated")).toBe("ff_err_auth");
  });
  it("falls back to a generic message", () => {
    expect(firstFreeErrorKey("connection reset")).toBe("ff_err_generic");
  });
});

describe("returning to the intended free flow after sign-in", () => {
  it("keeps a same-origin path", () => {
    expect(sanitizeRedirect("/free-greeting")).toBe("/free-greeting");
  });
  it("drops external destinations", () => {
    expect(sanitizeRedirect("https://evil.example/x")).toBe("/free-greeting");
    expect(sanitizeRedirect("//evil.example")).toBe("/free-greeting");
    expect(sanitizeRedirect(null, "/dashboard")).toBe("/dashboard");
  });
});