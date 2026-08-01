// Administration view of every finished Live Greeting Card on the platform.

import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AdminLiveGreetingRow = {
  id: string;
  user_id: string;
  user_email: string | null;
  status: string;
  title: string | null;
  image_prompt: string | null;
  motion_prompt: string;
  motion_prompt_en: string | null;
  duration_seconds: number;
  aspect_ratio: string | null;
  generator_key: string | null;
  image_url: string | null;
  video_url: string | null;
  greeting_text: string;
  created_at: string;
  finalized_at: string | null;
  delivered: boolean;
  deleted_at: string | null;
  purge_after: string | null;
  deleted_by_admin: boolean;
};

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const { data } = await (context.supabase as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
  }).rpc("is_admin", { _user_id: context.userId });
  if (data !== true) throw new Error("forbidden");
}

/** Every generated live greeting card with owner, prompts, media and dates. */
export const listUserLiveGreetings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminLiveGreetingRow[]> => {
    await assertAdmin(context as never);
    const { getAdmin } = await import("./deleted-cards.server");
    const supabaseAdmin = await getAdmin();

    const { data, error } = await supabaseAdmin
      .from("live_card_animations")
      .select(
        "id, user_id, status, title, source_card_id, source_bucket, source_path, prompt, prompt_en, duration_seconds, aspect_ratio, generator_key, storage_bucket, storage_path, greeting_text, created_at, finalized_at, final_path, deleted_at, purge_after, deleted_by",
      )
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const cardIds = [...new Set(rows.map((r) => r.source_card_id).filter(Boolean))] as string[];
    const prompts = new Map<string, string>();
    if (cardIds.length) {
      const { data: cards } = await supabaseAdmin
        .from("live_greeting_cards")
        .select("id, prompt")
        .in("id", cardIds);
      for (const card of cards ?? []) prompts.set(card.id, card.prompt ?? "");
    }

    const sign = async (bucket: string | null, path: string | null) => {
      if (!bucket || !path) return null;
      const signed = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 3600);
      return signed.data?.signedUrl ?? null;
    };

    const emails = new Map<string, string | null>();
    const out: AdminLiveGreetingRow[] = [];
    for (const row of rows) {
      if (!emails.has(row.user_id)) {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(row.user_id);
        emails.set(row.user_id, u?.user?.email ?? null);
      }
      out.push({
        id: row.id,
        user_id: row.user_id,
        user_email: emails.get(row.user_id) ?? null,
        status: row.status,
        title: row.title ?? null,
        image_prompt: row.source_card_id ? prompts.get(row.source_card_id) ?? null : null,
        motion_prompt: row.prompt ?? "",
        motion_prompt_en: row.prompt_en ?? null,
        duration_seconds: row.duration_seconds ?? 5,
        aspect_ratio: row.aspect_ratio ?? null,
        generator_key: row.generator_key ?? null,
        image_url: await sign(row.source_bucket, row.source_path),
        video_url: await sign(row.storage_bucket, row.storage_path),
        greeting_text: row.greeting_text ?? "",
        created_at: row.created_at,
        finalized_at: row.finalized_at ?? null,
        delivered: Boolean(row.finalized_at && row.final_path),
        deleted_at: row.deleted_at ?? null,
        purge_after: row.purge_after ?? null,
        deleted_by_admin: Boolean(row.deleted_by),
      });
    }
    return out;
  });

/**
 * Administration deletion follows exactly the greeting-card rules: the record
 * is kept for the retention period, can be restored, and is only removed for
 * good once that period has passed.
 */
export const adminDeleteLiveGreeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { animationId: string }) => {
    if (!input?.animationId) throw new Error("animationId is required");
    return { animationId: input.animationId };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { getAdmin, readRetentionDays, recordAdminAction } = await import("./deleted-cards.server");
    const supabaseAdmin = await getAdmin();
    const days = await readRetentionDays();
    const now = new Date();

    const { data: row } = await supabaseAdmin
      .from("live_card_animations")
      .select("id, user_id, deleted_at")
      .eq("id", data.animationId)
      .maybeSingle();
    if (!row) throw new Error("animation_not_found");

    const purgeAfter = new Date(now.getTime() + days * 86_400_000).toISOString();
    const { error } = await supabaseAdmin
      .from("live_card_animations")
      .update({ deleted_at: now.toISOString(), purge_after: purgeAfter, deleted_by: context.userId })
      .eq("id", data.animationId);
    if (error) throw new Error(error.message);

    await recordAdminAction({
      actorUserId: context.userId,
      action: "live_greeting.deleted",
      entityType: "live_card_animation",
      entityId: row.id,
      affectedUserId: row.user_id,
      previous: { deleted_at: row.deleted_at },
      next: { deleted_at: now.toISOString(), purge_after: purgeAfter },
    });
    return { ok: true, purgeAfter };
  });

/** Brings a deleted live greeting card back into the owner's account. */
export const adminRestoreLiveGreeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { animationId: string }) => {
    if (!input?.animationId) throw new Error("animationId is required");
    return { animationId: input.animationId };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { getAdmin, recordAdminAction } = await import("./deleted-cards.server");
    const supabaseAdmin = await getAdmin();

    const { data: row } = await supabaseAdmin
      .from("live_card_animations")
      .select("id, user_id, deleted_at, purge_after")
      .eq("id", data.animationId)
      .maybeSingle();
    if (!row) throw new Error("animation_not_found");

    const { error } = await supabaseAdmin
      .from("live_card_animations")
      .update({ deleted_at: null, purge_after: null, deleted_by: null })
      .eq("id", data.animationId);
    if (error) throw new Error(error.message);

    await recordAdminAction({
      actorUserId: context.userId,
      action: "live_greeting.restored",
      entityType: "live_card_animation",
      entityId: row.id,
      affectedUserId: row.user_id,
      previous: { deleted_at: row.deleted_at, purge_after: row.purge_after },
      next: { deleted_at: null },
    });
    return { ok: true };
  });

/** Irreversible removal — only allowed once the retention period has expired. */
export const adminPurgeLiveGreeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { animationId: string }) => {
    if (!input?.animationId) throw new Error("animationId is required");
    return { animationId: input.animationId };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { getAdmin, purgeLiveAnimationCompletely, recordAdminAction } = await import(
      "./deleted-cards.server"
    );
    const supabaseAdmin = await getAdmin();

    const { data: row } = await supabaseAdmin
      .from("live_card_animations")
      .select("id, user_id, prompt, deleted_at, purge_after")
      .eq("id", data.animationId)
      .maybeSingle();
    if (!row) throw new Error("animation_not_found");
    if (!row.deleted_at) throw new Error("not_deleted");
    if (row.purge_after && new Date(row.purge_after).getTime() > Date.now()) {
      throw new Error("retention_active");
    }

    await purgeLiveAnimationCompletely(row.id);
    await recordAdminAction({
      actorUserId: context.userId,
      action: "live_greeting.purged",
      entityType: "live_card_animation",
      entityId: row.id,
      affectedUserId: row.user_id,
      previous: { prompt: row.prompt, deleted_at: row.deleted_at },
    });
    return { ok: true };
  });

/**
 * Hands an already generated live greeting card to its owner — or to another
 * account chosen by e-mail. Nothing is generated again: this repeats only the
 * delivery step, so a card that failed at the last moment is never lost.
 */
export const adminDeliverLiveGreeting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { animationId: string; email?: string }) => {
    if (!input?.animationId) throw new Error("animationId is required");
    return {
      animationId: String(input.animationId),
      email: String(input?.email ?? "").trim().toLowerCase().slice(0, 200),
    };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { getAdmin, recordAdminAction } = await import("./deleted-cards.server");
    const { deliverLiveGreeting } = await import("@/lib/live-cards/lifecycle.server");
    const supabaseAdmin = await getAdmin();

    let targetUserId: string | null = null;
    if (data.email) {
      // The chosen account is resolved by its e-mail address.
      for (let page = 1; page <= 10 && !targetUserId; page += 1) {
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
        const users = list?.users ?? [];
        const found = users.find((u) => (u.email ?? "").toLowerCase() === data.email);
        if (found) targetUserId = found.id;
        if (users.length < 200) break;
      }
      if (!targetUserId) throw new Error("user_not_found");
    }

    const result = await deliverLiveGreeting({
      animationId: data.animationId,
      targetUserId,
      actorUserId: context.userId,
    });

    await recordAdminAction({
      actorUserId: context.userId,
      action: result.alreadyDelivered ? "live_greeting.redelivered" : "live_greeting.delivered",
      entityType: "live_card_animation",
      entityId: data.animationId,
      affectedUserId: result.userId,
      next: { user_id: result.userId, email: data.email || null },
    });
    return result;
  });

/**
 * Returns an already generated live greeting card to its owner without
 * finishing it: the card appears in the person's "unfinished live greeting
 * cards" so they can add the greeting themselves. Nothing is generated again.
 */
export const adminReturnLiveGreetingToUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { animationId: string; email?: string }) => {
    if (!input?.animationId) throw new Error("animationId is required");
    return {
      animationId: String(input.animationId),
      email: String(input?.email ?? "").trim().toLowerCase().slice(0, 200),
    };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { getAdmin, recordAdminAction } = await import("./deleted-cards.server");
    const { logLiveCardEvent } = await import("@/lib/live-cards/lifecycle.server");
    const supabaseAdmin = await getAdmin();

    const { data: row } = await supabaseAdmin
      .from("live_card_animations")
      .select("id, user_id, status, title, storage_path")
      .eq("id", data.animationId)
      .maybeSingle();
    if (!row) throw new Error("animation_not_found");
    if (row.status !== "ready" || !row.storage_path) throw new Error("generation_incomplete");

    let targetUserId = row.user_id;
    if (data.email) {
      let found: string | null = null;
      for (let page = 1; page <= 10 && !found; page += 1) {
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
        const users = list?.users ?? [];
        const match = users.find((u) => (u.email ?? "").toLowerCase() === data.email);
        if (match) found = match.id;
        if (users.length < 200) break;
      }
      if (!found) throw new Error("user_not_found");
      targetUserId = found;
    }

    const { error } = await supabaseAdmin
      .from("live_card_animations")
      .update({ user_id: targetUserId, deleted_at: null, purge_after: null, deleted_by: null })
      .eq("id", row.id);
    if (error) throw new Error(error.message);

    try {
      await supabaseAdmin.from("notification_jobs").insert({
        user_id: targetUserId,
        notification_type: "live_card.returned",
        channel: "in_app",
        status: "pending",
        payload: { animation_id: row.id, title: row.title ?? null } as never,
      });
    } catch {
      /* a missing notification must never lose the card */
    }

    await logLiveCardEvent({
      actorUserId: context.userId,
      ownerUserId: targetUserId,
      animationId: row.id,
      stage: "assigned_to_user",
      detail: { returned_as_draft: true },
    });
    await recordAdminAction({
      actorUserId: context.userId,
      action: "live_greeting.returned_to_user",
      entityType: "live_card_animation",
      entityId: row.id,
      affectedUserId: targetUserId,
      next: { user_id: targetUserId, email: data.email || null, finalized: false },
    });
    return { ok: true, userId: targetUserId };
  });
