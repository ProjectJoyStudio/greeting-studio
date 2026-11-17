import { describe, it, expect } from "vitest";
import { isWorkingObject, mayCleanWorking, pageDependencyIds } from "./storage-policy";
import { memoryBookWorkingKey } from "../storage/keys";
describe("Memory Book storage safeguards", () => {
  it("uses exact UUID owner/book identity and rejects normalized collisions", () => {
    const user = "ddb9c1b8-8531-4371-a5f0-ef1f10089632", book = "8ce42f28-414a-4c21-ae45-3eddaf2d418a";
    expect(memoryBookWorkingKey(user, book, "photos", "a.jpg")).toBe(`users/${user}/memory-book/${book}/working/photos/a.jpg`);
    expect(() => memoryBookWorkingKey(` ${user}`, book, "a.jpg")).toThrow("invalid_storage_owner");
  });
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
});import { cleanupRetryDelayMs, cleanupErrorIsTerminal, CLEANUP_RETRY_LIMIT } from "./storage-policy";
describe("automatic working cleanup policy", () => {
  it("retries temporary failures after one minute, growing to at most 30 minutes", () => {
    expect(cleanupRetryDelayMs(1)).toBe(60_000);
    expect(cleanupRetryDelayMs(2)).toBe(120_000);
    expect(cleanupRetryDelayMs(20)).toBe(30 * 60_000);
    expect(CLEANUP_RETRY_LIMIT).toBe(8);
  });
  it("never automatically retries a failed final-copy verification or an out-of-scope key", () => {
    expect(cleanupErrorIsTerminal("cleanup_final_dependency_unverified")).toBe(true);
    expect(cleanupErrorIsTerminal("cleanup_key_invalid")).toBe(true);
    expect(cleanupErrorIsTerminal("delete_verify:http_403")).toBe(false);
    expect(cleanupErrorIsTerminal("list_http_503")).toBe(false);
  });
});
