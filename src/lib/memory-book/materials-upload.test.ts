import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadMemoryBookMaterial } from "./materials-upload";
import { MEMORY_BOOK_SOURCE_VIDEO_MAX_SECONDS } from "./materials";

const request = { bookId: "book", data: new Blob(["photo"]), fileName: "photo.png", contentType: "image/png" };
const ticket = { ok: true, storage: "r2", key: "users/user/memory-book/book/photos/test.png", uploadUrl: "https://storage.example/test" };
afterEach(() => vi.unstubAllGlobals());

describe("Book Materials direct R2 uploads", () => {
  it("uses a single direct PUT and returns the existing photo key", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    expect(await uploadMemoryBookMaterial(async () => ticket, request)).toEqual({ storage: "r2", path: ticket.key });
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(ticket.uploadUrl, { method: "PUT", headers: { "content-type": "image/png" }, body: request.data });
  });
  it("preserves the existing source-video key without proxying the file", async () => {
    const key = "memory-book/user/book/source-test.mp4";
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    expect(await uploadMemoryBookMaterial(async () => ({ ...ticket, key }), { ...request, contentType: "video/mp4" })).toEqual({ storage: "r2", path: key });
    expect(fetcher.mock.calls[0]?.[1].body).toBe(request.data);
  });
  it("never writes to legacy storage after a CORS/network failure", async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetcher);
    await expect(uploadMemoryBookMaterial(async () => ticket, request)).rejects.toMatchObject({ category: "r2_network", detail: "cors_or_network" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("preserves HTTP failure status without leaking signed credentials", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 403 })));
    await expect(uploadMemoryBookMaterial(async () => ticket, request)).rejects.toMatchObject({ category: "r2_http", detail: "http_403" });
  });
  it("does not upload after ownership rejection", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(uploadMemoryBookMaterial(async () => ({ ok: false, error: "authorization" }), request)).rejects.toMatchObject({ category: "authorization" });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not upload when R2 is unconfigured", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(uploadMemoryBookMaterial(async () => ({ ok: false, error: "configuration" }), request)).rejects.toMatchObject({ category: "server", detail: "r2_not_configured" });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects empty files before issuing a ticket", async () => {
    const issue = vi.fn();
    await expect(uploadMemoryBookMaterial(issue, { ...request, data: new Blob() })).rejects.toMatchObject({ category: "validation" });
    expect(issue).not.toHaveBeenCalled();
  });
  it("keeps the existing 60-minute source-video limit", () => {
    expect(MEMORY_BOOK_SOURCE_VIDEO_MAX_SECONDS).toBe(3600);
  });
});