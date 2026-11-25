// Administrator view of Personal Video Greeting operations that are stuck or
// flagged for investigation, plus the two explicit recovery actions.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface PvgOperationRow {
  id: string;
  projectId: string;
  status: string;
  submissionState: string | null;
  route: string;
  engine: string | null;
  predictionId: string | null;
  creditsCharged: number;
  needsReview: boolean;
  reviewReason: string | null;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  lastReconcileAt: string | null;
  callbackCount: number;
}

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const sb = context.supabase as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
  };
  const { data } = await sb.rpc("is_admin", { _user_id: context.userId });
  if (data !== true) throw new Error("forbidden");
}

export const listPvgOperations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PvgOperationRow[]> => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const stuckBefore = new Date(Date.now() - 20 * 60_000).toISOString();
    const { data } = await supabaseAdmin
      .from("pvg_videos")
      .select(
        "id, project_id, status, submission_state, speech_route, video_generator_key, video_prediction_id, credits_charged, needs_review, review_reason, reconcile_attempts, last_reconcile_error, created_at, last_reconcile_at, callback_count",
      )
      .or(
        `needs_review.eq.true,and(status.in.(pending,processing,lipsync,assets),created_at.lt.${stuckBefore}),and(status.eq.failed,credits_charged.gt.0)`,
      )
      .order("created_at", { ascending: false })
      .limit(100);
    return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
      id: String(r["id"]),
      projectId: String(r["project_id"]),
      status: String(r["status"]),
      submissionState: (r["submission_state"] as string | null) ?? null,
      route: String(r["speech_route"] ?? "person"),
      engine: (r["video_generator_key"] as string | null) ?? null,
      predictionId: (r["video_prediction_id"] as string | null) ?? null,
      creditsCharged: Number(r["credits_charged"] ?? 0),
      needsReview: Boolean(r["needs_review"]),
      reviewReason: (r["review_reason"] as string | null) ?? null,
      attempts: Number(r["reconcile_attempts"] ?? 0),
      lastError: (r["last_reconcile_error"] as string | null) ?? null,
      createdAt: String(r["created_at"]),
      lastReconcileAt: (r["last_reconcile_at"] as string | null) ?? null,
      callbackCount: Number(r["callback_count"] ?? 0),
    }));
  });

const resolveInput = z.object({
  videoId: z.string().uuid(),
  action: z.enum(["recheck", "confirm_failed"]),
  note: z.string().max(300).optional(),
});

export const resolvePvgOperation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: z.input<typeof resolveInput>) => resolveInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    // Runs as the administrator: the database function re-checks the role.
    const rpc = context.supabase.rpc.bind(context.supabase) as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
    const { data: result, error } = await rpc("admin_resolve_pvg_video", {
      _video_id: data.videoId,
      _action: data.action,
      _note: data.note ?? null,
    });
    if (error) throw new Error(error.message);
    return result as { ok: boolean; error?: string; refunded?: number };
  });
