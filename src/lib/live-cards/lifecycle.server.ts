// ---------------------------------------------------------------------------
// One place that records every step of a live greeting card's life: started,
// generated, uploaded, saved, assigned to its owner, notification sent.
// Nothing here can ever interrupt the workflow — logging failures are silent.
// ---------------------------------------------------------------------------

export type LiveCardStage =
  | "generation_started"
  | "generation_completed"
  | "render_started"
  | "render_completed"
  | "upload_completed"
  | "database_saved"
  | "assigned_to_user"
  | "notification_sent"
  | "failed";

export async function logLiveCardEvent(input: {
  actorUserId: string | null;
  ownerUserId?: string | null;
  animationId: string | null;
  stage: LiveCardStage;
  ok?: boolean;
  detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_user_id: input.actorUserId,
      action: `live_card.${input.stage}`,
      entity_type: "live_card_animation",
      entity_id: input.animationId,
      new_data: {
        stage: input.stage,
        ok: input.ok !== false,
        owner_user_id: input.ownerUserId ?? null,
        ...(input.detail ?? {}),
      } as never,
      request_metadata: { source: "live_cards" } as never,
    });
  } catch {
    /* logging must never break the workflow */
  }
}

/**
 * Delivery of an already generated live greeting card: the finished animation
 * is linked to its owner so it appears in "My live greeting cards". Nothing is
 * generated again — this only repeats the final assignment step.
 */
export async function deliverLiveGreeting(params: {
  animationId: string;
  targetUserId?: string | null;
  actorUserId: string;
}): Promise<{ ok: boolean; userId: string; alreadyDelivered: boolean }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: row, error } = await supabaseAdmin
    .from("live_card_animations")
    .select(
      "id, user_id, status, title, storage_bucket, storage_path, final_bucket, final_path, final_mime, final_has_text, finalized_at, greeting_text, metadata",
    )
    .eq("id", params.animationId)
    .maybeSingle();
  if (error) throw new Error(`database_read_failed: ${error.message}`);
  if (!row) throw new Error("animation_not_found");
  if (row.status !== "ready") throw new Error("generation_incomplete");
  if (!row.storage_bucket || !row.storage_path) throw new Error("video_missing");

  const userId = params.targetUserId || row.user_id;
  const alreadyDelivered = Boolean(row.finalized_at && row.final_path);

  const patch: Record<string, unknown> = {
    user_id: userId,
    deleted_at: null,
    purge_after: null,
  };
  if (!alreadyDelivered) {
    // The plain animation itself becomes the delivered version, so a card that
    // failed at the very last step is never lost.
    patch.final_bucket = row.final_bucket ?? row.storage_bucket;
    patch.final_path = row.final_path ?? row.storage_path;
    patch.final_mime = row.final_mime ?? "video/mp4";
    patch.final_has_text = row.final_has_text ?? false;
    patch.finalized_at = new Date().toISOString();
  }

  const { error: updateError } = await supabaseAdmin
    .from("live_card_animations")
    .update(patch as never)
    .eq("id", row.id);
  if (updateError) throw new Error(`user_assignment_failed: ${updateError.message}`);

  await logLiveCardEvent({
    actorUserId: params.actorUserId,
    ownerUserId: userId,
    animationId: row.id,
    stage: "assigned_to_user",
    detail: { already_delivered: alreadyDelivered, reassigned: userId !== row.user_id },
  });

  // Completion notification, exactly like a normally finished card.
  try {
    await supabaseAdmin.from("notification_jobs").insert({
      user_id: userId,
      notification_type: "live_card.ready",
      channel: "in_app",
      status: "pending",
      payload: { animation_id: row.id, title: row.title ?? null } as never,
    });
    await logLiveCardEvent({
      actorUserId: params.actorUserId,
      ownerUserId: userId,
      animationId: row.id,
      stage: "notification_sent",
    });
  } catch (e) {
    await logLiveCardEvent({
      actorUserId: params.actorUserId,
      ownerUserId: userId,
      animationId: row.id,
      stage: "notification_sent",
      ok: false,
      detail: { error: e instanceof Error ? e.message : "unknown" },
    });
  }

  // If the card belongs to an order, that order is now complete.
  const orderId = (row.metadata as { order_id?: string } | null)?.order_id;
  if (orderId) {
    await supabaseAdmin
      .from("orders")
      .update({ status: "completed", completed_at: new Date().toISOString() } as never)
      .eq("id", orderId);
  }

  return { ok: true, userId, alreadyDelivered };
}
