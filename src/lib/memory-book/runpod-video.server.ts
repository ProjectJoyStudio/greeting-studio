import { MEMORY_BOOK_R2_BUCKET } from "./materials";
import { memoryBookVideoKey } from "./video-storage.functions";
import { memoryBookFileUrl } from "./storage.server";
import { storageFor } from "@/lib/storage/registry.server";
import { verifyWithRetry } from "@/lib/storage/backup.server";
import { VIDEO_URL_LIFETIME_SECONDS, safeWorkerError, validateProcessingFragments, validateWorkerResult, workerPayload, type VideoJobView, type VideoJobStatus } from "./runpod-video";
import type { MemoryBookVideoFragment } from "./video-prep";

type DB = { from: (table: string) => any };
type Job = { id: string; book_id: string; user_id: string; source_material_id: string; provider_job_id: string | null; status: VideoJobStatus; fragments: MemoryBookVideoFragment[]; output_path: string; output_result: unknown; material_id: string | null; started_at: string; lease_until: string | null };
export interface RunpodConfig { key: string; endpoint: string }
export interface JobContext { userId: string; supabase: unknown }
const TABLE = "memory_book_video_jobs";
async function db(): Promise<DB> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
async function authorize(context: JobContext, bookId: string) {
  const { data, error } = await (context.supabase as DB).from("memory_book_projects").select("id, credits_spent, status").eq("id", bookId).eq("user_id", context.userId).maybeSingle();
  if (error || !data || Number(data.credits_spent) <= 0 || data.status === "completed") throw new Error("not_found");
}
async function provider(config: RunpodConfig, path: string, body?: unknown): Promise<Record<string, unknown>> {
  if (!config.key || !/^[a-zA-Z0-9_-]+$/.test(config.endpoint)) throw new Error("runpod_configuration");
  let response: Response;
  try {
    response = await fetch(`https://api.runpod.ai/v2/${config.endpoint}/${path}`, { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${config.key}`, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000) });
  } catch { throw new Error("runpod_network"); }
  if (!response.ok) throw new Error(`runpod_http_${response.status}`);
  try { return await response.json() as Record<string, unknown>; } catch { throw new Error("runpod_invalid_response"); }
}
async function update(client: DB, id: string, patch: Record<string, unknown>) {
  const { error } = await client.from(TABLE).update(patch).eq("id", id);
  if (error) throw new Error("processing_database");
}
async function view(job: Job): Promise<VideoJobView> {
  const result = job.status === "ready" ? validateWorkerResult(job.output_result, job.fragments) : null;
  const url = result ? await memoryBookFileUrl(MEMORY_BOOK_R2_BUCKET, job.output_path, 3600) : null;
  return { id: job.id, status: job.status, sourceMaterialId: job.source_material_id, fragments: job.fragments, ...(result && url ? { result: { url, seconds: result.duration_seconds } } : {}), ...(job.material_id ? { materialId: job.material_id } : {}) };
}
async function activeJob(client: DB, bookId: string, userId: string): Promise<Job | null> {
  const { data, error } = await client.from(TABLE).select("*").eq("book_id", bookId).eq("user_id", userId).in("status", ["submitting", "queued", "running", "ready", "finalizing"]).maybeSingle();
  if (error) throw new Error("processing_database");
  return data;
}
export async function submitVideoJob(context: JobContext, input: { bookId: string; materialId: string; fragments: MemoryBookVideoFragment[] }, config: RunpodConfig): Promise<VideoJobView> {
  await authorize(context, input.bookId);
  const client = await db();
  const active = await activeJob(client, input.bookId, context.userId);
  if (active) return view(active);
  const fragments = validateProcessingFragments(input.fragments).map(f => ({ ...f, sourceId: f.sourceId || input.materialId }));
  const ids = [...new Set(fragments.map(f => f.sourceId))];
  const { data: materials, error } = await client.from("memory_book_materials").select("id, kind, bucket, path, duration_seconds").eq("book_id", input.bookId).eq("user_id", context.userId).in("id", [...new Set([...ids, input.materialId])]);
  if (error || !materials?.some((m: any) => m.id === input.materialId && m.kind === "video")) throw new Error("invalid_source");
  const urls = new Map<string, string>();
  for (const id of ids) {
    const m = materials.find((row: any) => row.id === id);
    if (!m || m.kind !== "video") throw new Error("invalid_source");
    if (Number(m.duration_seconds) > 0 && fragments.some(f => f.sourceId === id && f.end > Number(m.duration_seconds) + 0.1)) throw new Error("invalid_range");
    // Legacy reads stay compatible without moving existing objects.
    const url = await memoryBookFileUrl(m.bucket, m.path, VIDEO_URL_LIFETIME_SECONDS);
    if (!url || !url.startsWith("https://")) throw new Error("source_unavailable");
    urls.set(id, url);
  }
  const primary = storageFor("primary");
  const outputPath = memoryBookVideoKey(context.userId, input.bookId, "prepared", "mp4");
  const putUrl = await primary?.signedWriteUrl(outputPath, VIDEO_URL_LIFETIME_SECONDS, "video/mp4");
  if (!putUrl) throw new Error("storage_configuration");
  const { data: inserted, error: insertError } = await client.from(TABLE).insert({ book_id: input.bookId, user_id: context.userId, source_material_id: input.materialId, fragments, output_path: outputPath }).select("*").single();
  if (insertError) {
    const winner = await activeJob(client, input.bookId, context.userId);
    if (winner) return view(winner);
    throw new Error("processing_database");
  }
  const job: Job = inserted;
  // Persist exactly the submitted instructions before paying for a job.
  const { error: editError } = await client.from("memory_book_video_edits").upsert({ book_id: input.bookId, user_id: context.userId, source_material_id: input.materialId, fragments }, { onConflict: "book_id,source_material_id" });
  if (editError) {
    await update(client, job.id, { status: "failed", last_error: { stage: "save_fragments", message: "database" }, completed_at: new Date().toISOString() });
    throw new Error("processing_database");
  }
  try {
    const pieces = fragments.map(f => {
      const url = urls.get(f.sourceId);
      if (!url) throw new Error("invalid_source");
      return { source_id: f.sourceId, source_url: url, start: f.start, end: f.end };
    });
    const result = await provider(config, "run", workerPayload(pieces, putUrl));
    if (typeof result.id !== "string" || !/^[a-zA-Z0-9_-]+$/.test(result.id)) throw new Error("runpod_missing_job_id");
    await update(client, job.id, { provider_job_id: result.id, status: "queued" });
    return view({ ...job, provider_job_id: result.id, status: "queued" });
  } catch (e) {
    const code = e instanceof Error ? e.message : "runpod_submission";
    // Ambiguous dispatch (timeout, invalid response, DB save failure): block replacement
    // until the 60-minute provider TTL expires. Never risk two paid jobs.
    const definitive = /^runpod_http_(400|401|403|404|422|429)$/.test(code) || code === "runpod_configuration";
    await update(client, job.id, { ...(definitive ? { status: "failed", completed_at: new Date().toISOString() } : {}), last_error: { stage: "submit", message: code } });
    if (definitive) throw new Error(code);
    return view(job);
  }
}
export async function pollVideoJob(context: JobContext, bookId: string, config: RunpodConfig): Promise<VideoJobView | null> {
  await authorize(context, bookId);
  const client = await db();
  const job = await activeJob(client, bookId, context.userId);
  if (!job) return null;
  if (job.status === "ready" || job.status === "finalizing") return view(job);
  if (Date.now() - Date.parse(job.started_at) > 65 * 60 * 1000) {
    await update(client, job.id, { status: "failed", completed_at: new Date().toISOString(), last_error: { stage: "lifetime", message: "runpod_expired" } });
    return view({ ...job, status: "failed" });
  }
  if (!job.provider_job_id) return view(job);
  const result = await provider(config, `status/${encodeURIComponent(job.provider_job_id)}`);
  const status = String(result.status);
  if (["FAILED", "TIMED_OUT", "CANCELLED"].includes(status)) {
    const detail = safeWorkerError(result.output);
    await update(client, job.id, { status: "failed", completed_at: new Date().toISOString(), last_error: { ...detail, message: detail.message || status } });
    return view({ ...job, status: "failed" });
  }
  if (status === "COMPLETED") {
    try {
      const output = validateWorkerResult(result.output, job.fragments);
      const primary = storageFor("primary");
      if (!primary) throw new Error("primary_unavailable");
      const check = await verifyWithRetry(primary, job.output_path);
      if (check.state !== "exists") throw new Error(check.state === "missing" ? "output_missing" : "output_verification");
      if (check.info.sizeBytes !== output.size_bytes) throw new Error("output_size_mismatch");
      const { error } = await client.from(TABLE).update({ status: "ready", output_result: output, last_error: null }).eq("id", job.id).in("status", ["queued", "running"]);
      if (error) throw new Error("processing_database");
      return view({ ...job, status: "ready", output_result: output });
    } catch (e) {
      const detail = safeWorkerError(result.output);
      await client.from(TABLE).update({ status: "failed", completed_at: new Date().toISOString(), last_error: { ...detail, stage: detail.stage || "verify_output", message: detail.message || (e instanceof Error ? e.message : "invalid_output") } }).eq("id", job.id).in("status", ["queued", "running"]);
      return view({ ...job, status: "failed" });
    }
  }
  if (!["IN_QUEUE", "IN_PROGRESS"].includes(status)) throw new Error("runpod_invalid_status");
  const next = status === "IN_PROGRESS" ? "running" : "queued";
  await client.from(TABLE).update({ status: next }).eq("id", job.id).in("status", ["queued", "running"]);
  return view({ ...job, status: next });
}
export async function confirmVideoJob(context: JobContext, bookId: string, jobId: string) {
  await authorize(context, bookId);
  const client = await db();
  const { data: job, error } = await client.from(TABLE).select("*").eq("id", jobId).eq("book_id", bookId).eq("user_id", context.userId).maybeSingle();
  if (error || !job) throw new Error("not_found");
  if (job.status === "completed") return { ok: true, materialId: job.material_id as string };
  const now = new Date().toISOString();
  const { data: locked, error: lockError } = await client.from(TABLE).update({ status: "finalizing", lease_until: new Date(Date.now() + 10 * 60000).toISOString() }).eq("id", jobId).or(`status.eq.ready,and(status.eq.finalizing,lease_until.lt.${now})`).select("*").maybeSingle();
  if (lockError || !locked) return { ok: false };
  try {
    const output = validateWorkerResult(locked.output_result, locked.fragments);
    const primary = storageFor("primary");
    if (!primary) throw new Error("primary_unavailable");
    const check = await verifyWithRetry(primary, locked.output_path);
    if (check.state !== "exists" || check.info.sizeBytes !== output.size_bytes) throw new Error("output_verification");
    const { finalizePreparedMaterial } = await import("./video-finalize.server");
    const ids: string[] = [...new Set((locked.fragments as MemoryBookVideoFragment[]).map(f => f.sourceId || locked.source_material_id))];
    const saved = await finalizePreparedMaterial({ bookId, sourceMaterialId: locked.source_material_id, sourceMaterialIds: ids, path: locked.output_path, storage: MEMORY_BOOK_R2_BUCKET, fileName: "prepared.mp4", mimeType: "video/mp4", sizeBytes: output.size_bytes, durationSeconds: output.duration_seconds }, context);
    if (!saved.ok || !saved.materialId) throw new Error("finalization_failed");
    await update(client, jobId, { status: "completed", material_id: saved.materialId, completed_at: now, lease_until: null, last_error: null });
    return { ok: true, materialId: saved.materialId };
  } catch (e) {
    await update(client, jobId, { status: "ready", lease_until: null, last_error: { stage: "finalize", message: e instanceof Error ? e.message : "finalization_failed" } });
    return { ok: false };
  }
}
export async function discardVideoJob(context: JobContext, bookId: string, jobId: string) {
  await authorize(context, bookId);
  const client = await db();
  const { data, error } = await client.from(TABLE).update({ status: "discarded", completed_at: new Date().toISOString() }).eq("id", jobId).eq("book_id", bookId).eq("user_id", context.userId).eq("status", "ready").select("id").maybeSingle();
  if (error || !data) throw new Error("processing_database");
  // No source, output or independent reserve deletion on redo.
  return { ok: true };
}