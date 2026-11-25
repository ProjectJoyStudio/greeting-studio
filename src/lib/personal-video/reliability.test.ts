import { afterEach, describe, expect, it, vi } from "vitest";

import { pollStage, dispatchFingerprint } from "./generator/pipeline.server";
import { buildSceneVideoPrompt } from "./generator/video-prompt";
import { pvgBackoffMs, PVG_MAX_TRANSIENT_ATTEMPTS } from "./video-render.server";
import { verifyReplicateSignature } from "./webhook-signature";

afterEach(() => vi.unstubAllGlobals());

async function sign(secretB64: string, id: string, ts: string, body: string) {
  const raw = Uint8Array.from(atob(secretB64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${body}`)));
  return `v1,${btoa(String.fromCharCode(...mac))}`;
}

describe("provider callback signature", () => {
  const secret = btoa("project-joy-test-secret-32-bytes!");
  const now = 1_800_000_000;
  it("accepts a correctly signed Replicate delivery", async () => {
    const sig = await sign(secret, "msg_1", String(now), '{"id":"abc"}');
    expect(await verifyReplicateSignature(`whsec_${secret}`, "msg_1", String(now), '{"id":"abc"}', sig, now)).toBe(true);
  });
  it("rejects a forged body", async () => {
    const sig = await sign(secret, "msg_1", String(now), '{"id":"abc"}');
    expect(await verifyReplicateSignature(`whsec_${secret}`, "msg_1", String(now), '{"id":"evil"}', sig, now)).toBe(false);
  });
  it("rejects a replay older than five minutes", async () => {
    const ts = String(now - 301);
    const sig = await sign(secret, "msg_1", ts, "{}");
    expect(await verifyReplicateSignature(`whsec_${secret}`, "msg_1", ts, "{}", sig, now)).toBe(false);
  });
});

describe("ambiguous provider state is never a failure", () => {
  it("a missing Replicate prediction goes to review, not to failure/refund", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));
    expect(await pollStage("abc123def456")).toEqual({ state: "processing", unknown: true });
  });
  it("HTTP 500 while polling is a transient error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));
    expect(await pollStage("abc123def456")).toEqual({ state: "processing", transient: true });
  });
});

describe("bounded retries", () => {
  it("backs off 30s, 60s, 120s and caps at 30 minutes", () => {
    expect(pvgBackoffMs(1)).toBe(30_000);
    expect(pvgBackoffMs(2)).toBe(60_000);
    expect(pvgBackoffMs(3)).toBe(120_000);
    expect(pvgBackoffMs(20)).toBe(30 * 60_000);
  });
  it("flags after 8 consecutive errors", () => expect(PVG_MAX_TRANSIENT_ATTEMPTS).toBe(8));
});

describe("lost-submission matching", () => {
  it("fingerprint depends on model, image and audio", async () => {
    const a = await dispatchFingerprint("m", "i", "a");
    expect(a).toBe(await dispatchFingerprint("m", "i", "a"));
    expect(a).not.toBe(await dispatchFingerprint("m", "i", "b"));
  });
});

describe("no-speaker film", () => {
  it("asks for voice-over with nobody speaking on screen", () => {
    const p = buildSceneVideoPrompt("");
    expect(p).toContain("off-screen voice-over");
    expect(p).toContain("Nobody in the picture speaks");
  });
});
