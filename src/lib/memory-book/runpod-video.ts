import { fragmentsLength, type MemoryBookVideoFragment } from "./video-prep";

export const RUNPOD_POLICY = { executionTimeout: 1800000, ttl: 3600000 };
export const VIDEO_URL_LIFETIME_SECONDS = 7200;
export type VideoJobStatus = "submitting" | "queued" | "running" | "ready" | "finalizing" | "completed" | "failed" | "discarded";
export interface VideoJobView {
  id: string;
  status: VideoJobStatus;
  sourceMaterialId: string;
  fragments: MemoryBookVideoFragment[];
  result?: { url: string; seconds: number };
  materialId?: string;
}
export interface WorkerResult {
  ok: true; piece_count: number; duration_seconds: number; size_bytes: number;
  sha256: string; width: number; height: number; fps: number;
  container: string; video_codec: string; audio_codec: string;
}
export function validateProcessingFragments(value: MemoryBookVideoFragment[]) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) throw new Error("invalid_fragments");
  if (value.some(f => !f || !Number.isFinite(f.start) || !Number.isFinite(f.end) || f.start < 0 || f.end <= f.start)) throw new Error("invalid_fragments");
  // Avoid floating-point false positives at exactly 300 seconds; never round individual pieces.
  if (fragmentsLength(value) > 300 + 1e-9) throw new Error("too_long");
  return value.map(f => ({ id: String(f.id).slice(0, 64), sourceId: f.sourceId, start: f.start, end: f.end }));
}
export function validateWorkerResult(value: unknown, fragments: MemoryBookVideoFragment[]): WorkerResult {
  const r = value as Partial<WorkerResult> | null;
  if (!r || r.ok !== true || r.piece_count !== fragments.length ||
      typeof r.duration_seconds !== "number" || !Number.isFinite(r.duration_seconds) || r.duration_seconds <= 0 || r.duration_seconds > 301 ||
      Math.abs(r.duration_seconds - fragmentsLength(fragments)) > 1 ||
      !Number.isSafeInteger(r.size_bytes) || Number(r.size_bytes) <= 0 ||
      !/^[a-f0-9]{64}$/i.test(r.sha256 ?? "") ||
      !Number.isFinite(r.width) || Number(r.width) <= 0 || !Number.isFinite(r.height) || Number(r.height) <= 0 ||
      Math.max(Number(r.width), Number(r.height)) > 1280 ||
      r.fps !== 30 || r.container !== "mp4" || r.video_codec !== "h264" || r.audio_codec !== "aac") throw new Error("invalid_output");
  return r as WorkerResult;
}
export function workerPayload(pieces: Array<{ source_id: string; source_url: string; start: number; end: number }>, outputPutUrl: string) {
  return { input: { pieces, output_put_url: outputPutUrl, output_headers: { "content-type": "video/mp4" }, max_long_side: 1280 }, policy: RUNPOD_POLICY };
}
/** Do not persist/log provider messages containing URLs or credentials. */
export function safeWorkerError(value: unknown) {
  const r = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const clean = (v: unknown) => String(v ?? "").replace(/https?:\/\/\S+/gi, "[redacted-url]").replace(/Bearer\s+\S+/gi, "[redacted]").slice(0, 300);
  return { stage: clean(r.stage), message: clean(r.message), piece_index: Number.isInteger(r.piece_index) ? r.piece_index : null, source_id: /^[a-f0-9-]{36}$/i.test(String(r.source_id ?? "")) ? r.source_id : null };
}