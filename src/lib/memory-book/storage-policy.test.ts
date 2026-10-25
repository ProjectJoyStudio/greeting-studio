import { describe, it, expect } from "vitest";
import { isWorkingObject, mayCleanWorking, pageDependencyIds } from "./storage-policy";
describe("Memory Book storage safeguards", () => {
  it("only permits exact same-book working objects, never completed or shared files", () => {
    expect(isWorkingObject("u", "b", "users/u/memory-book/b/working/photos/a.jpg")).toBe(true);
    for (const key of ["users/u/memory-book/other/working/a", "users/u/memory-book/b/completed/a", "system/designs/a", "users/u/memory-book/b/working/../a"]) expect(isWorkingObject("u", "b", key)).toBe(false);
  });
  it("requires activation AND primary AND backup verification before cleanup", () => {
    expect(mayCleanWorking(true, true, true)).toBe(true);
    expect(mayCleanWorking(false, true, true)).toBe(false);
    expect(mayCleanWorking(true, false, true)).toBe(false);
    expect(mayCleanWorking(true, true, false)).toBe(false);
  });
  it("inventories photo, video and decoration dependencies on both covers and pages", () => {
    const ids = pageDependencyIds([{ page_index: -1, slots: [{ materialId: "back-photo" }], decorations: [{ decorationId: "sticker" }] }, { page_index: 1, video_material_id: "video" }]);
    expect([...ids.materials]).toEqual(["back-photo", "video"]);
    expect([...ids.decorations]).toEqual(["sticker"]);
  });
});