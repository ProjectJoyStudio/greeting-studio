import { describe, expect, it, vi } from "vitest";
import { classifyVideoMaterial, isEditingSourceRow, loadVideoClassification } from "./material-classification.server";

function database(pageIds: (string | null)[], jobIds: (string | null)[], error: unknown = null) {
  const filters: unknown[][] = [];
  const from = vi.fn((table: string) => {
    const query = {
      select: () => query,
      eq: (key: string, value: string) => { filters.push([table, key, value]); return query; },
      then: (resolve: (value: unknown) => unknown) => resolve({
        data: table === "memory_book_pages" ? pageIds.map(video_material_id => ({ video_material_id })) : jobIds.map(material_id => ({ material_id })),
        error,
      }),
    };
    return query;
  });
  return { db: { from } as unknown as Parameters<typeof loadVideoClassification>[0], filters };
}

describe("same-book finished-video server classification", () => {
  it("keeps ordinary uploaded videos as sources", async () => {
    const { db } = database([], []);
    expect(isEditingSourceRow({ id: "source", kind: "video" }, await loadVideoClassification(db, "book", "user"))).toBe(true);
  });
  it("rejects assembled videos with the original marker", async () => {
    const { db } = database([], []);
    expect(isEditingSourceRow({ id: "assembled", kind: "video", prepared_from_material_id: "source" }, await loadVideoClassification(db, "book", "user"))).toBe(false);
  });
  it("recognizes confirmed RunPod output after source deletion nulls its marker", async () => {
    const { db } = database([], ["confirmed"]);
    const classification = await loadVideoClassification(db, "book", "user");
    expect(classifyVideoMaterial({ id: "confirmed", prepared_from_material_id: null }, classification)).toEqual({ prepared: true, usedOnPage: false });
    expect(isEditingSourceRow({ id: "confirmed", kind: "video", prepared_from_material_id: null }, classification)).toBe(false);
  });
  it("rejects existing page videos without any assembled marker", async () => {
    const { db } = database(["page", "page", null], []);
    const classification = await loadVideoClassification(db, "book", "user");
    expect(classification.pageUsedIds.size).toBe(1);
    expect(isEditingSourceRow({ id: "page", kind: "video", prepared_from_material_id: null }, classification)).toBe(false);
  });
  it("scopes both sources of evidence to the same book and user and completed jobs only", async () => {
    const { db, filters } = database([], []);
    await loadVideoClassification(db, "book", "user");
    expect(filters).toEqual([
      ["memory_book_pages", "book_id", "book"], ["memory_book_pages", "user_id", "user"],
      ["memory_book_video_jobs", "book_id", "book"], ["memory_book_video_jobs", "user_id", "user"],
      ["memory_book_video_jobs", "status", "completed"],
    ]);
  });
  it("fails closed when current classification cannot be read", async () => {
    const { db } = database([], [], { message: "unavailable" });
    await expect(loadVideoClassification(db, "book", "user")).rejects.toThrow("video_classification_failed");
  });
  it("reads current state on a return load without retaining pre-confirmation evidence", async () => {
    const before = await loadVideoClassification(database([], []).db, "book", "user");
    const after = await loadVideoClassification(database([], ["new-output"]).db, "book", "user");
    expect(classifyVideoMaterial({ id: "new-output" }, before).prepared).toBe(false);
    expect(classifyVideoMaterial({ id: "new-output" }, after).prepared).toBe(true);
  });
});