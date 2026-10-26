import { afterEach, describe, expect, it, vi } from "vitest";
import { createS3Adapter } from "./s3-adapter.server";

const settings = { endpoint: "https://s3.eu-central-003.backblazeb2.com", bucket: "reserve", accessKeyId: "id", secretAccessKey: "secret", region: "eu-central-003" };
const key = "users/u/memory-book/b/working/photos/p.png";
const xmlError = (code: string, message: string) => `<?xml version="1.0"?><Error><Code>${code}</Code><Message>${message}</Message></Error>`;
const listing = (keys: string[]) => `<?xml version="1.0"?><ListBucketResult>${keys.map(k => `<Contents><Key>${k}</Key></Contents>`).join("")}</ListBucketResult>`;

function provider(answer: (req: Request) => Response) {
  const calls: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: Request) => { calls.push(`${input.method} ${new URL(input.url).search ? "list" : "object"}${input.headers.get("range") ? " range" : ""}`); return answer(input); }));
  return { adapter: createS3Adapter("b2", () => settings), calls };
}
afterEach(() => vi.unstubAllGlobals());

describe("B2 HEAD 403 handling", () => {
  it("403 alone is never treated as absence when every explanation is denied", async () => {
    const { adapter } = provider(req => req.method === "HEAD" ? new Response(null, { status: 403 })
      : new URL(req.url).search ? new Response(xmlError("AccessDenied", "not entitled"), { status: 403 })
      : new Response(xmlError("AccessDenied", "Cannot access bucket"), { status: 403 }));
    expect(await adapter.check(key)).toMatchObject({ state: "error", status: 403, detail: "http_403:AccessDenied", message: "Cannot access bucket" });
  });
  it("accepts absence only from an authorized exact-key listing", async () => {
    const { adapter, calls } = provider(req => req.method === "HEAD" ? new Response(null, { status: 403 })
      : new URL(req.url).search ? new Response(listing([`${key}.other`]), { status: 200 })
      : new Response(xmlError("AccessDenied", "Cannot access bucket"), { status: 403 }));
    expect(await adapter.check(key)).toEqual({ state: "missing", status: 404, confirmedBy: "list" });
    expect(calls).toEqual(["HEAD object", "GET object range", "GET list"]);
  });
  it("does not report missing when the listing contains the exact key", async () => {
    const { adapter } = provider(req => req.method === "HEAD" ? new Response(null, { status: 403 })
      : new URL(req.url).search ? new Response(listing([key]), { status: 200 })
      : new Response(xmlError("AccessDenied", "x"), { status: 403 }));
    expect(await adapter.check(key)).toMatchObject({ state: "error", detail: "http_403:listed_but_denied" });
  });
  it("accepts an authoritative NoSuchKey on GET", async () => {
    const { adapter } = provider(req => req.method === "HEAD" ? new Response(null, { status: 403 }) : new Response(xmlError("NoSuchKey", "Key not found"), { status: 404 }));
    expect(await adapter.check(key)).toEqual({ state: "missing", status: 404, confirmedBy: "get" });
  });
  it("reports the transaction cap code so it stays a visible retryable error", async () => {
    const { adapter } = provider(req => req.method === "HEAD" ? new Response(null, { status: 403 })
      : new URL(req.url).search ? new Response(null, { status: 403 }) : new Response(xmlError("AccessDenied", "transaction_cap_exceeded"), { status: 403 }));
    expect(await adapter.check(key)).toMatchObject({ state: "error", status: 403, message: "transaction_cap_exceeded" });
  });
  it("genuine HEAD 404 is still missing without extra requests", async () => {
    const { adapter, calls } = provider(() => new Response(null, { status: 404 }));
    expect(await adapter.check(key)).toEqual({ state: "missing", status: 404, confirmedBy: "head" });
    expect(calls).toEqual(["HEAD object"]);
  });
});

describe("digest verification during finalization", () => {
  const body = new Uint8Array([1, 2, 3]);
  const ok = (req: Request) => req.headers.get("range")
    ? new Response(body, { status: 206, headers: { "content-range": "bytes 0-2/3" } })
    : new Response(null, { status: 200, headers: { "content-length": "3", etag: "\"e\"" } });
  it("retries a temporary HEAD failure and still computes SHA-256", async () => {
    let heads = 0;
    const { adapter } = provider(req => req.method === "HEAD" && heads++ === 0 ? new Response(null, { status: 503 }) : ok(req));
    const d = await adapter.digest(key);
    expect(d).toEqual({ checksum: "sha256:039058c6f2c0cb492c533b0a4d14ef77cc0f78abccced5287d84a1a2011cfb81", sizeBytes: 3 });
  });
  it("reports a persistent provider error as a check error, never as missing", async () => {
    const { adapter } = provider(() => new Response(null, { status: 500 }));
    await expect(adapter.digest(key)).rejects.toThrow("storage_digest_check:b2:http_500");
  });
  it("reports missing only for a real 404", async () => {
    const { adapter } = provider(() => new Response(null, { status: 404 }));
    await expect(adapter.digest(key)).rejects.toThrow("storage_digest_missing:b2");
  });
});
