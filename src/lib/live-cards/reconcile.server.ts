// ---------------------------------------------------------------------------
// Background completion of live greeting card animations.
//
// Generation continues on the engine even when nobody is watching the creation
// page. This module finishes the work for a running animation with service
// rights: it polls the engine, stores the finished video and leaves the card
// in the owner's account as an unfinished live greeting card, ready to be
// continued later. It never starts a new generation.
// ---------------------------------------------------------------------------

const PENDING = ["preparing", "queued", "processing", "storing"];

type PendingRow = {
  id: string;
  user_id: string;
  status: string;
  generator_key: string | null;
  prediction_id: string | null;
  title: string | null;
  duration_seconds: number | null;
};

export type ReconcileOutcome = "pending" | "ready" | "failed" | "skipped";

/** Finishes one animation if the engine is done with it. Never throws. */
export async function reconcileAnimation(animationId: string): Promise<ReconcileOutcome> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("live_card_animations")
    .select("id, user_id, status, generator_key, prediction_id, title, duration_seconds")
    .eq("id", animationId)
    .maybeSingle();
  const row = data as PendingRow | null;
  if (!row) return "skipped";
  if (!PENDING.includes(row.status) || !row.prediction_id) return "skipped";

  const { logLiveCardEvent } = await import("./lifecycle.server");
  const patch = async (values: Record<string, unknown>) => {
    await supabaseAdmin.from("live_card_animations").update(values as never).eq("id", row.id);
  };

  try {
    const { pollVideoRequest } = await import("./generators/router.server");
    const progress = await pollVideoRequest(row.generator_key ?? "", row.prediction_id);

    if (progress.state === "queued" || progress.state === "processing") {
      if (row.status !== progress.state) await patch({ status: progress.state });
      return "pending";
    }
    if (progress.state === "failed") {
      await patch({
        status: "failed",
        error_code: progress.errorCode,
        error_message: progress.errorMessage,
        completed_at: new Date().toISOString(),
      });
      await notifyOwner(row, "live_card.failed");
      await logLiveCardEvent({
        actorUserId: null,
        ownerUserId: row.user_id,
        animationId: row.id,
        stage: "failed",
        ok: false,
        detail: { step: "generation", errorCode: progress.errorCode, background: true },
      });
      return "failed";
    }

    const { liveCardsVideoBucket } = await import("./env.server");
    const bucket = liveCardsVideoBucket();
    const res = await fetch(progress.url);
    if (!res.ok) {
      await patch({
        status: "failed",
        error_code: "download_failed",
        error_message: `Could not fetch the animation (${res.status}).`,
        completed_at: new Date().toISOString(),
      });
      await notifyOwner(row, "live_card.failed");
      return "failed";
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    const { stripAudioTrack } = await import("./mp4-audio.server");
    const silent = stripAudioTrack(bytes);
    const { readMp4DurationSeconds } = await import("./mp4-duration.server");
    const deliveredDuration = readMp4DurationSeconds(bytes);
    const storagePath = `${row.user_id}/${row.id}.${progress.fileExtension}`;
    const upload = await supabaseAdmin.storage
      .from(bucket)
      .upload(storagePath, silent, { contentType: progress.contentType, upsert: true });
    if (upload.error) {
      await patch({
        status: "failed",
        error_code: "storage_failed",
        error_message: upload.error.message,
        completed_at: new Date().toISOString(),
      });
      await notifyOwner(row, "live_card.failed");
      return "failed";
    }

    // The finished animation stays unfinalised on purpose: it belongs to the
    // owner's "unfinished live greeting cards" until the greeting is added.
    await patch({
      status: "ready",
      storage_bucket: bucket,
      storage_path: storagePath,
      sound_enabled: false,
      completed_at: new Date().toISOString(),
      deleted_at: null,
      purge_after: null,
    });
    await logLiveCardEvent({
      actorUserId: null,
      ownerUserId: row.user_id,
      animationId: row.id,
      stage: "generation_completed",
      detail: {
        bucket,
        path: storagePath,
        background: true,
        model: row.generator_key,
        selectedDurationSeconds: row.duration_seconds,
        returnedDurationSeconds: deliveredDuration,
        durationMismatch:
          deliveredDuration !== null &&
          row.duration_seconds !== null &&
          Math.abs(deliveredDuration - row.duration_seconds) > 0.75,
      },
    });
    await notifyOwner(row, "live_card.ready");
    return "ready";
  } catch {
    // Transient engine or network trouble — the next pass tries again.
    return "pending";
  }
}

/** Tells the owner that the card is waiting in the personal account. */
async function notifyOwner(row: PendingRow, type: string): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("notification_jobs").insert({
      user_id: row.user_id,
      notification_type: type,
      channel: "in_app",
      status: "pending",
      payload: { animation_id: row.id, title: row.title ?? null } as never,
    });
    const { logLiveCardEvent } = await import("./lifecycle.server");
    await logLiveCardEvent({
      actorUserId: null,
      ownerUserId: row.user_id,
      animationId: row.id,
      stage: "notification_sent",
    });
  } catch {
    /* a missing notification must never lose the card */
  }
}

/** Finishes every running animation of one person. */
export async function reconcileUserAnimations(userId: string): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("live_card_animations")
    .select("id")
    .eq("user_id", userId)
    .in("status", PENDING)
    .limit(20);
  const ids = ((data ?? []) as { id: string }[]).map((r) => r.id);
  let finished = 0;
  for (const id of ids) {
    const outcome = await reconcileAnimation(id);
    if (outcome === "ready" || outcome === "failed") finished += 1;
  }
  return finished;
}

/** Platform-wide sweep used by the scheduled background job. */
export async function reconcilePendingAnimations(limit = 40): Promise<{
  checked: number;
  ready: number;
  failed: number;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("live_card_animations")
    .select("id")
    .in("status", PENDING)
    .not("prediction_id", "is", null)
    .order("created_at", { ascending: true })
    .limit(limit);
  const ids = ((data ?? []) as { id: string }[]).map((r) => r.id);
  let ready = 0;
  let failed = 0;
  for (const id of ids) {
    const outcome = await reconcileAnimation(id);
    if (outcome === "ready") ready += 1;
    if (outcome === "failed") failed += 1;
  }
  return { checked: ids.length, ready, failed };
}
