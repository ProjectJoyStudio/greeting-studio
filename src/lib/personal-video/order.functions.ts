import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { clampRetentionDays, normalizeStep, type PvgCreditEntry } from "./order";

// --- shared shapes ---------------------------------------------------------

export interface DeletedPvgDraftRow {
  id: string;
  userId: string;
  userEmail: string | null;
  recipientName: string;
  occasion: string;
  workflowStep: string;
  status: string;
  createdAt: string;
  deletedAt: string | null;
  purgeAfter: string | null;
  creditsCharged: number;
  previewUrl: string | null;
}

export interface DeletedPvgDraftDetail extends DeletedPvgDraftRow {
  sceneDescription: string;
  greetingText: string;
  greetingKeywords: string;
  greetingMode: string;
  durationSeconds: number;
  orderCost: number;
  version: number;
  creditHistory: PvgCreditEntry[];
  people: { id: string; name: string; photoUrl: string | null; faceQuality: string }[];
  scenes: { id: string; status: string; imageUrl: string | null; approved: boolean }[];
  files: { bucket: string; path: string }[];
}

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const { data } = await (
    context.supabase as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
    }
  ).rpc("is_admin", { _user_id: context.userId });
  if (data !== true) throw new Error("forbidden");
}

// --- the person who owns the order ----------------------------------------

/**
 * The user removes their unfinished project. Nothing is destroyed: the order
 * keeps its id, its files and its credit history, and moves to the
 * administrator recycle bin until the retention window ends.
 */
export const softDeletePvgProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("pvg_projects")
      .select("id, user_id, status, deleted_at")
      .eq("id", data.projectId)
      .maybeSingle();
    const project = row as {
      id: string;
      user_id: string;
      status: string;
      deleted_at: string | null;
    } | null;
    if (!project || project.user_id !== userId) throw new Error("project_not_found");
    if (project.deleted_at) return { ok: true as const };

    const { readRetentionDays } = await import("./order.server");
    const days = await readRetentionDays();
    const now = new Date();
    const { error } = await supabase
      .from("pvg_projects")
      .update({
        deleted_at: now.toISOString(),
        purge_after: new Date(now.getTime() + days * 86_400_000).toISOString(),
        status: "deleted_by_user",
      })
      .eq("id", project.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Keeps one browser tab as the writer, so two devices cannot fight. */
export const claimPvgEditSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { projectId: string; sessionId: string; takeOver?: boolean | undefined }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("pvg_projects")
      .select("id, user_id, edit_session_id, edit_heartbeat_at")
      .eq("id", data.projectId)
      .maybeSingle();
    const project = row as {
      id: string;
      user_id: string;
      edit_session_id: string | null;
      edit_heartbeat_at: string | null;
    } | null;
    if (!project || project.user_id !== userId) throw new Error("project_not_found");

    const now = Date.now();
    const beat = project.edit_heartbeat_at ? new Date(project.edit_heartbeat_at).getTime() : 0;
    const otherActive =
      Boolean(project.edit_session_id) &&
      project.edit_session_id !== data.sessionId &&
      now - beat < 90_000;

    if (otherActive && !data.takeOver) return { editable: false as const };

    await supabase
      .from("pvg_projects")
      .update({ edit_session_id: data.sessionId, edit_heartbeat_at: new Date(now).toISOString() })
      .eq("id", project.id);
    return { editable: true as const };
  });

// --- administrator recycle bin --------------------------------------------

export const getPvgRetention = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as never);
    const { readRetentionDays } = await import("./order.server");
    return { days: await readRetentionDays() };
  });

export const setPvgRetention = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { days: number }) => ({ days: clampRetentionDays(input?.days) }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { writeRetentionDays } = await import("./order.server");
    const { recordAdminAction } = await import("@/lib/admin/deleted-cards.server");
    const days = await writeRetentionDays(data.days, context.userId);
    await recordAdminAction({
      actorUserId: context.userId,
      action: "pvg_draft.retention_changed",
      entityType: "app_setting",
      entityId: "pvg_retention_days",
      next: { days },
    });
    return { days };
  });

export const listDeletedPvgDrafts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DeletedPvgDraftRow[]> => {
    await assertAdmin(context as never);
    const { getAdmin } = await import("./order.server");
    const supabaseAdmin = await getAdmin();

    const { data, error } = await supabaseAdmin
      .from("pvg_projects")
      .select(
        "id, user_id, recipient_name, occasion, workflow_step, status, created_at, deleted_at, purge_after, credits_charged, selected_scene_id, permanently_deleted",
      )
      .not("deleted_at", "is", null)
      .eq("permanently_deleted", false)
      .order("deleted_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const emails = new Map<string, string | null>();
    const rows: DeletedPvgDraftRow[] = [];
    for (const row of data ?? []) {
      if (!emails.has(row.user_id)) {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(row.user_id);
        emails.set(row.user_id, u?.user?.email ?? null);
      }
      const { data: scene } = await supabaseAdmin
        .from("pvg_scenes")
        .select("storage_bucket, storage_path")
        .eq("project_id", row.id)
        .eq("status", "ready")
        .order("variation_index")
        .limit(1)
        .maybeSingle();
      let previewUrl: string | null = null;
      if (scene?.storage_bucket && scene.storage_path) {
        const signed = await supabaseAdmin.storage
          .from(scene.storage_bucket)
          .createSignedUrl(scene.storage_path, 3600);
        previewUrl = signed.data?.signedUrl ?? null;
      }
      rows.push({
        id: row.id,
        userId: row.user_id,
        userEmail: emails.get(row.user_id) ?? null,
        recipientName: row.recipient_name ?? "",
        occasion: row.occasion ?? "",
        workflowStep: normalizeStep(row.workflow_step),
        status: row.status,
        createdAt: row.created_at,
        deletedAt: row.deleted_at,
        purgeAfter: row.purge_after,
        creditsCharged: row.credits_charged ?? 0,
        previewUrl,
      });
    }
    return rows;
  });

/** Read-only look inside a deleted order — nothing is created or charged. */
export const previewDeletedPvgDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string }) => input)
  .handler(async ({ data, context }): Promise<DeletedPvgDraftDetail> => {
    await assertAdmin(context as never);
    const { getAdmin } = await import("./order.server");
    const supabaseAdmin = await getAdmin();

    const { data: project } = await supabaseAdmin
      .from("pvg_projects")
      .select("*")
      .eq("id", data.projectId)
      .maybeSingle();
    if (!project) throw new Error("project_not_found");
    const p = project as Record<string, any>;

    const { data: u } = await supabaseAdmin.auth.admin.getUserById(p["user_id"]);
    const [{ data: people }, { data: scenes }] = await Promise.all([
      supabaseAdmin.from("pvg_people").select("*").eq("project_id", p["id"]).order("position"),
      supabaseAdmin
        .from("pvg_scenes")
        .select("*")
        .eq("project_id", p["id"])
        .order("variation_index"),
    ]);

    const files: { bucket: string; path: string }[] = [];
    const sign = async (bucket: string | null, path: string | null) => {
      if (!bucket || !path) return null;
      files.push({ bucket, path });
      const res = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 3600);
      return res.data?.signedUrl ?? null;
    };

    const peopleOut = [];
    for (const person of (people ?? []) as Record<string, any>[]) {
      peopleOut.push({
        id: person["id"],
        name: person["name"] ?? "",
        photoUrl: await sign(person["optimized_bucket"], person["optimized_path"]),
        faceQuality: person["face_quality"] ?? "unknown",
      });
      if (person["original_path"]) await sign(person["original_bucket"], person["original_path"]);
    }

    const scenesOut = [];
    for (const scene of (scenes ?? []) as Record<string, any>[]) {
      scenesOut.push({
        id: scene["id"],
        status: scene["status"],
        imageUrl: await sign(scene["storage_bucket"], scene["storage_path"]),
        approved: scene["id"] === p["selected_scene_id"],
      });
    }

    return {
      id: p["id"],
      userId: p["user_id"],
      userEmail: u?.user?.email ?? null,
      recipientName: p["recipient_name"] ?? "",
      occasion: p["occasion"] ?? "",
      workflowStep: normalizeStep(p["workflow_step"]),
      status: p["status"],
      createdAt: p["created_at"],
      deletedAt: p["deleted_at"],
      purgeAfter: p["purge_after"],
      creditsCharged: p["credits_charged"] ?? 0,
      previewUrl: scenesOut.find((s) => s.approved)?.imageUrl ?? scenesOut[0]?.imageUrl ?? null,
      sceneDescription: p["scene_description"] ?? "",
      greetingText: p["greeting_text"] ?? "",
      greetingKeywords: p["greeting_keywords"] ?? "",
      greetingMode: p["greeting_mode"] ?? "manual",
      durationSeconds: p["video_duration_seconds"] ?? 0,
      orderCost: p["order_cost"] ?? 0,
      version: p["version"] ?? 0,
      creditHistory: Array.isArray(p["credit_history"])
        ? (p["credit_history"] as PvgCreditEntry[])
        : [],
      people: peopleOut,
      scenes: scenesOut,
      files,
    };
  });

/** Gives the order back to the very same person, with the same order id. */
export const restorePvgDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { getAdmin } = await import("./order.server");
    const { recordAdminAction } = await import("@/lib/admin/deleted-cards.server");
    const supabaseAdmin = await getAdmin();

    const { data: project } = await supabaseAdmin
      .from("pvg_projects")
      .select("id, user_id, status, deleted_at, purge_after, permanently_deleted")
      .eq("id", data.projectId)
      .maybeSingle();
    if (!project) throw new Error("project_not_found");
    if (project.permanently_deleted) throw new Error("already_purged");
    if (!project.deleted_at) return { ok: true as const };

    const { error } = await supabaseAdmin
      .from("pvg_projects")
      .update({
        deleted_at: null,
        purge_after: null,
        status: "restored_by_admin",
        restored_at: new Date().toISOString(),
        restored_by: context.userId,
      })
      .eq("id", project.id)
      .not("deleted_at", "is", null);
    if (error) throw new Error(error.message);

    await recordAdminAction({
      actorUserId: context.userId,
      action: "pvg_draft.restored",
      entityType: "pvg_project",
      entityId: project.id,
      affectedUserId: project.user_id,
      previous: { deleted_at: project.deleted_at, purge_after: project.purge_after },
      next: { status: "restored_by_admin" },
    });
    return { ok: true as const };
  });

/** Irreversible removal of every file of the order. History is kept. */
export const purgePvgDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string }) => input)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { getAdmin, purgePvgProjectCompletely } = await import("./order.server");
    const { recordAdminAction } = await import("@/lib/admin/deleted-cards.server");
    const supabaseAdmin = await getAdmin();

    const { data: project } = await supabaseAdmin
      .from("pvg_projects")
      .select("id, user_id, credits_charged, deleted_at")
      .eq("id", data.projectId)
      .maybeSingle();
    if (!project) throw new Error("project_not_found");
    if (!project.deleted_at) throw new Error("not_deleted");

    await purgePvgProjectCompletely(project.id);
    await recordAdminAction({
      actorUserId: context.userId,
      action: "pvg_draft.purged",
      entityType: "pvg_project",
      entityId: project.id,
      affectedUserId: project.user_id,
      previous: { credits_charged: project.credits_charged },
      next: { status: "permanently_deleted" },
    });
    return { ok: true as const };
  });
