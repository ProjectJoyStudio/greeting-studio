// Server-only helpers of the single Personal Video Greeting order: retention
// window, permanent removal and the administrator recycle bin.

import { PVG_DEFAULT_RETENTION_DAYS, clampRetentionDays } from "./order";

export const PVG_RETENTION_KEY = "pvg_retention_days";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

export async function getAdmin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as Admin;
}

export async function readRetentionDays(): Promise<number> {
  const supabaseAdmin = await getAdmin();
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", PVG_RETENTION_KEY)
    .maybeSingle();
  const raw = (data?.value ?? {}) as { days?: unknown };
  return raw.days === undefined ? PVG_DEFAULT_RETENTION_DAYS : clampRetentionDays(raw.days);
}

export async function writeRetentionDays(days: number, actorUserId: string): Promise<number> {
  const supabaseAdmin = await getAdmin();
  const value = clampRetentionDays(days);
  await supabaseAdmin
    .from("app_settings")
    .upsert({ key: PVG_RETENTION_KEY, value: { days: value } as never, updated_by: actorUserId }, { onConflict: "key" });
  return value;
}

/**
 * Removes every file and record of one order for good. Financial history is
 * never touched and the order id stays as a permanently deleted marker.
 */
export async function purgePvgProjectCompletely(projectId: string): Promise<boolean> {
  const supabaseAdmin = await getAdmin();
  const { data: project } = await supabaseAdmin
    .from("pvg_projects")
    .select("id, user_id, permanently_deleted")
    .eq("id", projectId)
    .maybeSingle();
  if (!project || project.permanently_deleted) return false;

  const { purgeProjectFiles } = await import("./pvg.server");
  await purgeProjectFiles(projectId);

  await supabaseAdmin.from("pvg_scenes").delete().eq("project_id", projectId);
  await supabaseAdmin.from("pvg_people").delete().eq("project_id", projectId);
  await supabaseAdmin.from("pvg_project_versions").delete().eq("project_id", projectId);
  await supabaseAdmin
    .from("pvg_projects")
    .update({
      permanently_deleted: true,
      status: "permanently_deleted",
      selected_scene_id: null,
      purge_after: null,
      scene_description: "",
      greeting_text: "",
      greeting_keywords: "",
    })
    .eq("id", projectId);
  return true;
}

/** Scheduled clean-up of every order whose retention window has passed. */
export async function purgeExpiredPvgProjects(): Promise<{ purged: number }> {
  const supabaseAdmin = await getAdmin();
  const { data: rows } = await supabaseAdmin
    .from("pvg_projects")
    .select("id")
    .not("deleted_at", "is", null)
    .eq("permanently_deleted", false)
    .lte("purge_after", new Date().toISOString())
    .limit(200);

  let purged = 0;
  for (const row of rows ?? []) {
    if (await purgePvgProjectCompletely(row.id)) purged += 1;
  }
  return { purged };
}
