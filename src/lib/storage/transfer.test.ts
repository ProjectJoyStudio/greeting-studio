import { describe, it, expect, vi } from "vitest";
import { transferObject, deleteExactObjectVersions, type TransferState } from "./transfer.server";
import type { StorageAdapter } from "./types";

function adapter(exists: boolean): StorageAdapter {
  return {
    id: "r2", isReady: () => true, describe: () => "test",
    head: vi.fn(async () => ({ key: "source", sizeBytes: 10, contentType: "image/png", etag: "stable" })),
    check: vi.fn(async () => exists ? { state: "exists" as const, info: { key: "target", sizeBytes: 10, contentType: "image/png" } } : { state: "missing" as const, status: 404 }),
    digest: vi.fn(async () => ({ checksum: "sha256:equal", sizeBytes: 10 })),
    put: vi.fn(async () => true), getBytes: vi.fn(async () => new Uint8Array(10)),
    signedReadUrl: vi.fn(async () => null), signedWriteUrl: vi.fn(async () => null), deleteObject: vi.fn(async () => true),
    readRange: vi.fn(async () => new Uint8Array(10)), beginMultipart: vi.fn(async () => "upload"),
    writePart: vi.fn(async () => "etag"), completeMultipart: vi.fn(async () => {}), abortMultipart: vi.fn(async () => {}),
    listVersions: vi.fn(async () => []), deleteVersion: vi.fn(async () => {}),
  };
}
describe("verified exact-object transfers", () => {
  it("reuses a matching copy without creating a duplicate", async () => {
    const source = adapter(true), destination = adapter(true);
    await transferObject({ source, destination, sourceKey: "source", destinationKey: "target", save: async () => {} });
    expect(destination.beginMultipart).not.toHaveBeenCalled();
    expect(destination.digest).toHaveBeenCalledWith("target");
  });
  it("rejects equal-size content with a different checksum without overwriting", async () => {
    const source = adapter(true), destination = adapter(true);
    vi.mocked(destination.digest).mockResolvedValue({ checksum: "sha256:different", sizeBytes: 10 });
    await expect(transferObject({ source, destination, sourceKey: "source", destinationKey: "target", save: async () => {} })).rejects.toThrow("integrity_mismatch");
    expect(destination.beginMultipart).not.toHaveBeenCalled();
  });
  it("checkpoints multipart state and clears it only after verification", async () => {
    const saved: Array<TransferState | null> = [], source = adapter(true), destination = adapter(false);
    vi.mocked(destination.check).mockResolvedValueOnce({ state: "missing", status: 404 }).mockResolvedValueOnce({ state: "missing", status: 404 }).mockResolvedValue({ state: "exists", info: { key: "target", sizeBytes: 10, contentType: "image/png" } });
    await transferObject({ source, destination, sourceKey: "source", destinationKey: "target", save: async state => { saved.push(state); } });
    expect(saved[1]?.parts).toEqual([{ number: 1, etag: "etag" }]);
    expect(saved.at(-1)).toBe(null);
    expect(destination.completeMultipart).toHaveBeenCalledWith("target", "upload", [{ number: 1, etag: "etag" }]);
  });
  it("deletes only the exact requested versions and confirms absence", async () => {
    const a = adapter(false);
    vi.mocked(a.listVersions).mockResolvedValueOnce([{ key: "selected", versionId: "old" }, { key: "selected", versionId: "marker" }]).mockResolvedValueOnce([]);
    await deleteExactObjectVersions(a, "selected");
    expect(a.deleteVersion).toHaveBeenNthCalledWith(1, "selected", "old");
    expect(a.deleteVersion).toHaveBeenNthCalledWith(2, "selected", "marker");
    expect(a.deleteObject).not.toHaveBeenCalled();
  });
  it("does not delete when version listing fails", async () => {
    const a = adapter(true); vi.mocked(a.listVersions).mockRejectedValue(new Error("permission_denied"));
    await expect(deleteExactObjectVersions(a, "selected")).rejects.toThrow("permission_denied");
    expect(a.deleteObject).not.toHaveBeenCalled();
    expect(a.deleteVersion).not.toHaveBeenCalled();
  });
});