import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { MemoryBookVideoFragment } from "./video-prep";

const identify = (input: { bookId: string; jobId?: string }) => ({ bookId: String(input?.bookId ?? "").slice(0, 64), jobId: String(input?.jobId ?? "").slice(0, 64) });
export const startMemoryBookVideoJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { bookId: string; materialId: string; fragments: MemoryBookVideoFragment[] }) => ({ ...identify(input), materialId: String(input?.materialId ?? "").slice(0, 64), fragments: input?.fragments }))
  .handler(async ({ data, context }) => {
    const { submitVideoJob } = await import("./runpod-video.server");
    try {
      const job = await submitVideoJob(context, data, { key: process.env["RUNPOD_API_KEY"] ?? "", endpoint: process.env["RUNPOD_VIDEO_ENDPOINT_ID"] ?? "" });
      return { ok: true as const, job };
    } catch (e) {
      console.error("[mb-runpod] submit", e instanceof Error && /^[a-z0-9_]+$/.test(e.message) ? e.message : "processing_failed");
      return { ok: false as const, job: null };
    }
  });
export const getMemoryBookVideoJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator(identify)
  .handler(async ({ data, context }) => {
    const { pollVideoJob } = await import("./runpod-video.server");
    try { return { ok: true as const, job: await pollVideoJob(context, data.bookId, { key: process.env["RUNPOD_API_KEY"] ?? "", endpoint: process.env["RUNPOD_VIDEO_ENDPOINT_ID"] ?? "" }) }; }
    catch (e) {
      console.error("[mb-runpod] status", e instanceof Error && /^[a-z0-9_]+$/.test(e.message) ? e.message : "status_failed");
      return { ok: false as const, job: null };
    }
  });
export const confirmMemoryBookVideoJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator(identify)
  .handler(async ({ data, context }) => {
    const { confirmVideoJob } = await import("./runpod-video.server");
    try { return await confirmVideoJob(context, data.bookId, data.jobId); } catch { return { ok: false }; }
  });
export const discardMemoryBookVideoJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator(identify)
  .handler(async ({ data, context }) => {
    const { discardVideoJob } = await import("./runpod-video.server");
    return discardVideoJob(context, data.bookId, data.jobId);
  });