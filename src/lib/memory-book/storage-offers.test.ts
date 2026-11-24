import { describe, expect, it } from "vitest";
import { extendedExpiry, offerAvailable, offersForBook, parseOfferPrice } from "./storage-offers";

const year = { durationDays: 0, durationMonths: 12 };
const week = { durationDays: 7, durationMonths: 0 };
const now = new Date("2026-11-24T12:00:00Z");

describe("storage extension rules", () => {
  it("adds one calendar year to an active completed-book period", () => {
    expect(extendedExpiry("2027-01-10T00:00:00Z", year, now).toISOString()).toBe("2028-01-10T00:00:00.000Z");
  });
  it("never charges expired time: an ended period restarts from now", () => {
    expect(extendedExpiry("2026-11-22T11:55:49Z", year, now).toISOString()).toBe("2027-11-24T12:00:00.000Z");
  });
  it("+7 days extends from the current working end date", () => {
    expect(extendedExpiry("2026-12-01T00:00:00Z", week, now).toISOString()).toBe("2026-12-08T00:00:00.000Z");
  });
  it("an annual offer without a price cannot be bought", () => {
    expect(offerAvailable({ enabled: true, credits: null })).toBe(false);
    expect(offerAvailable({ enabled: false, credits: 50 })).toBe(false);
    expect(offerAvailable({ enabled: true, credits: 50 })).toBe(true);
  });
  it("unfinished and completed books never see each other's offers", () => {
    const offers = [{ service: "working" as const, code: "w" }, { service: "completed" as const, code: "y" }];
    expect(offersForBook(offers, "active").map((o) => o.code)).toEqual(["w"]);
    expect(offersForBook(offers, "completed").map((o) => o.code)).toEqual(["y"]);
  });
  it("admin price must be a whole number from 1 to 100000", () => {
    expect(parseOfferPrice("0")).toBe("invalid");
    expect(parseOfferPrice("2.5")).toBe("invalid");
    expect(parseOfferPrice("")).toBe(null);
    expect(parseOfferPrice("40")).toBe(40);
  });
});
