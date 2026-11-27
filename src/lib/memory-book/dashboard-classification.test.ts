import { describe, expect, it } from "vitest";
import { memoryBookCollection, purchasedStorageExpiry } from "./dashboard-classification";

describe("exclusive customer book collections", () => {
  it("unfinished books stay working even with purchase evidence", () => {
    expect(memoryBookCollection({ status: "active", purchasedStorageExpiresAt: "2027-11-27" })).toBe("working");
  });
  it("completed status and included or extended dates are not purchase evidence", () => {
    expect(memoryBookCollection({ status: "completed" })).toBe("completed");
    expect(memoryBookCollection({ status: "completed", purchasedStorageExpiresAt: null })).toBe("completed");
  });
  it("confirmed completed-storage purchases move a book exclusively to storage", () => {
    const book = { status: "completed", purchasedStorageExpiresAt: null as string | null };
    expect(memoryBookCollection(book)).toBe("completed");
    // Mock only: no payment, writes or real customer project.
    book.purchasedStorageExpiresAt = purchasedStorageExpiry([{ service: "completed", new_expires_at: "2027-11-27T00:00:00Z" }]);
    expect(memoryBookCollection(book)).toBe("storage");
    expect(["working", "completed", "storage"].filter((c) => c === memoryBookCollection(book))).toHaveLength(1);
  });
  it("expired paid books remain visible in storage", () => {
    expect(memoryBookCollection({ status: "completed", purchasedStorageExpiresAt: "2020-01-01T00:00:00Z" })).toBe("storage");
  });
  it("working purchases never establish completed-storage rights", () => {
    expect(purchasedStorageExpiry([{ service: "working", new_expires_at: "2028-01-01T00:00:00Z" }])).toBeNull();
  });
  it("uses latest confirmed paid deadline, ignores invalid evidence", () => {
    expect(purchasedStorageExpiry([
      { service: "completed", new_expires_at: "2027-11-27T00:00:00Z" },
      { service: "completed", new_expires_at: "2026-11-27T00:00:00Z" },
      { service: "completed", new_expires_at: "invalid" },
    ])).toBe("2027-11-27T00:00:00Z");
  });
});
