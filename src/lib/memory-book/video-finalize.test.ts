import { describe, expect, it, vi, beforeEach } from "vitest";
const mocks = vi.hoisted(() => ({ from: vi.fn(), remove: vi.fn(), record: vi.fn(), reserve: vi.fn(), placement: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: mocks.from } }));
vi.mock("./r2.server", () => ({ r2ObjectSize: async () => 1234 }));
vi.mock("./storage.server", () => ({ memoryBookFileRemove: mocks.remove }));
vi.mock("@/lib/storage/backup.server", () => ({ recordPrimary: mocks.record, placementOf: mocks.placement, backupToReserve: mocks.reserve }));
import { finalizePreparedMaterial } from "./video-finalize.server";
const input = { bookId: "book", sourceMaterialId: "one", sourceMaterialIds: ["one", "two"], path: "memory-book/user/book/prepared-test.mp4", storage: "r2", fileName: "prepared.mp4", mimeType: "video/mp4", sizeBytes: 1234, durationSeconds: 3 };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.record.mockResolvedValue(true);
  mocks.placement.mockResolvedValue({ status: "present", size_bytes: 1234 });
  mocks.reserve.mockResolvedValue({ ok: true });
  mocks.from.mockImplementation((table: string) => {
    const q: any = { select: () => q, eq: () => q, update: () => q, delete: () => q,
      maybeSingle: async () => ({ data: table === "memory_book_materials" ? { id: "prepared", book_id: "book", user_id: "user", path: input.path } : null }),
      then: (resolve: (r: unknown) => void) => resolve({ error: null }),
    };
    return q;
  });
});
describe("verified processing finalization safety", () => {
  it("does not clean sources when durable successful association cannot be written", async () => {
    await expect(finalizePreparedMaterial(input, { userId: "user" }, async () => { throw new Error("database"); })).rejects.toThrow("database");
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("does not clean sources before PRIMARY is recorded and read back", async () => {
    mocks.placement.mockResolvedValue({ status: "failed", size_bytes: 1234 });
    expect((await finalizePreparedMaterial(input, { userId: "user" }, vi.fn())).ok).toBe(false);
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("rejects output size mismatch before material finalization or cleanup", async () => {
    expect((await finalizePreparedMaterial({ ...input, sizeBytes: 999 }, { userId: "user" }, vi.fn())).ok).toBe(false);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("keeps the valid PRIMARY result usable when independent backup fails", async () => {
    mocks.reserve.mockRejectedValue(new Error("backup unavailable"));
    const onFinalized = vi.fn();
    expect((await finalizePreparedMaterial(input, { userId: "user" }, onFinalized)).ok).toBe(true);
    expect(onFinalized).toHaveBeenCalledWith("prepared");
    expect(mocks.reserve).toHaveBeenCalledWith(input.path);
  });
});