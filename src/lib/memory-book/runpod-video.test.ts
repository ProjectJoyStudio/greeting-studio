import { describe, it, expect } from "vitest";
import { workerPayload, validateProcessingFragments, validateWorkerResult, safeWorkerError, VIDEO_URL_LIFETIME_SECONDS } from "./runpod-video";
const fragments = [{ id: "b", sourceId: "two", start: 2.25, end: 4.75 }, { id: "a", sourceId: "one", start: 10, end: 12 }];
const result = { ok: true, piece_count: 2, duration_seconds: 4.5, size_bytes: 12345, sha256: "a".repeat(64), width: 1280, height: 720, fps: 30, container: "mp4", video_codec: "h264", audio_codec: "aac" };
describe("RunPod Memory Book contract", () => {
  it("keeps exact piece order, IDs and unrounded boundaries", () => {
    expect(validateProcessingFragments(fragments)).toEqual(fragments);
    expect(workerPayload(fragments.map(f => ({ source_id: f.sourceId, source_url: "https://signed.test/source", start: f.start, end: f.end })), "https://signed.test/output").input.pieces.map(p => p.source_id)).toEqual(["two", "one"]);
  });
  it("retains the 300-second selected duration limit", () => {
    expect(() => validateProcessingFragments([{ id: "a", start: 0, end: 300 }])).not.toThrow();
    expect(() => validateProcessingFragments([{ id: "a", start: 0, end: 300.01 }])).toThrow("too_long");
  });
  it("uses 30-minute execution and 60-minute lifetime, with longer signed URLs", () => {
    expect(workerPayload([], "https://signed.test/output").policy).toEqual({ executionTimeout: 1800000, ttl: 3600000 });
    expect(VIDEO_URL_LIFETIME_SECONDS).toBe(7200);
  });
  it("uses the existing worker contract and exact signed PUT headers", () => {
    expect(workerPayload([], "https://signed.test/output").input).toEqual({ pieces: [], output_put_url: "https://signed.test/output", output_headers: { "content-type": "video/mp4" }, max_long_side: 1280 });
  });
  it("rejects unsuccessful worker output before any finalization", () => {
    expect(() => validateWorkerResult({ ...result, ok: false }, fragments)).toThrow();
  });
  it("validates piece count and duration", () => {
    expect(validateWorkerResult(result, fragments).duration_seconds).toBe(4.5);
    expect(() => validateWorkerResult({ ...result, piece_count: 1 }, fragments)).toThrow();
    expect(() => validateWorkerResult({ ...result, duration_seconds: 302 }, fragments)).toThrow();
  });
  it("requires positive integer size and MP4 H264 AAC metadata", () => {
    expect(() => validateWorkerResult({ ...result, size_bytes: 0 }, fragments)).toThrow();
    expect(() => validateWorkerResult({ ...result, container: "webm" }, fragments)).toThrow();
  });
  it("persists only known output metadata and redacts signed URLs", () => {
    expect(validateWorkerResult({ ...result, source_url: "https://secret.test" }, fragments)).not.toHaveProperty("source_url");
    expect(safeWorkerError({ message: "fetch https://secret.test/a?signature=private", stage: "download" }).message).toBe("fetch [redacted-url]");
  });
});