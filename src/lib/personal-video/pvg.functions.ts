import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import {
  PERSON_COLUMNS,
  PROJECT_COLUMNS,
  SCENE_COLUMNS,
  reconcileScene,
  toPerson,
  toProjectShell,
  toScene,
  type PersonRow,
  type ProjectRow,
  type SceneRow,
} from "./pvg.server";
import { NO_TEXT_INSTRUCTION, wantsVisibleText } from "./generator/text-policy";
import {
  PVG_MAX_ADDED_PEOPLE,
  PVG_SCENE_PACK_CREDITS,
  addedPeople,
  pvgIncludedGenerations,
  pvgSceneAttempts,
  validatePvgProject,
} from "./types";
import type { PvgProject } from "./types";

// --- input shapes ----------------------------------------------------------

interface ProjectIdInput {
  projectId?: string | undefined;
}
interface SaveInput {
  projectId: string;
  recipientName: string;
  occasion: string;
  sceneDescription: string;
  workflowStep?: "scene" | "video" | undefined;
}
interface PhotoInput {
  projectId: string;
  personId?: string | undefined;
  name?: string | undefined;
  optimizedBase64: string;
  originalBase64?: string | undefined;
  contentType: string;
  faceQuality?: "good" | "low" | "unknown" | undefined;
  source?: "individual" | "group" | undefined;
}

const bytesFromBase64 = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const extensionFor = (contentType: string): string =>
  contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";

// --- shared loading --------------------------------------------------------

async function loadProject(
  supabase: { from: (t: string) => any },
  projectId: string,
): Promise<PvgProject | null> {
  const { data } = await supabase
    .from("pvg_projects")
    .select(PROJECT_COLUMNS)
    .eq("id", projectId)
    .is("deleted_at", null)
    // A delivered order has left the customer's hands for good.
    .is("delivered_at", null)
    .maybeSingle();
  const row = data as ProjectRow | null;
  if (!row) return null;

  const [{ data: peopleData }, { data: sceneData }] = await Promise.all([
    supabase
      .from("pvg_people")
      .select(PERSON_COLUMNS)
      .eq("project_id", projectId)
      .order("position"),
    supabase
      .from("pvg_scenes")
      .select(SCENE_COLUMNS)
      .eq("project_id", projectId)
      .order("variation_index"),
  ]);

  const people = await Promise.all(((peopleData ?? []) as PersonRow[]).map(toPerson));
  return {
    ...toProjectShell(row),
    // Included scenes follow the current number of people at all times.
    generationsLimit: pvgIncludedGenerations(addedPeople(people).length),
    people,
    scenes: await Promise.all(((sceneData ?? []) as SceneRow[]).map(toScene)),
  };
}

async function walletBalance(
  supabase: { from: (t: string) => any },
  userId: string,
): Promise<number> {
  const { data } = await supabase
    .from("credit_wallets")
    .select("id, balance")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as { balance: number } | null)?.balance ?? 0;
}

/** Only scenes that did not fail count against the package of five. */
const successfulScenes = (project: PvgProject): number =>
  project.scenes.filter((s) => s.status !== "failed").length;

/** Keeps the stored counter in step with the scenes that really succeeded. */
async function syncGenerationsUsed(
  supabase: { from: (t: string) => any },
  projectId: string,
  used: number,
): Promise<void> {
  await supabase.from("pvg_projects").update({ generations_used: used }).eq("id", projectId);
}

// --- server functions ------------------------------------------------------

/** Opens an existing project, or starts a fresh one for this person. */
export const openPvgProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ProjectIdInput) => input ?? {})
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.projectId) {
      const existing = await loadProject(supabase, data.projectId);
      if (existing) return { project: existing, balance: await walletBalance(supabase, userId) };
      throw new Error("project_not_found");
    }
    // One personal video is ONE project. An untouched draft of this person is
    // reopened instead of adding another empty record — two calls arriving at
    // the same moment (a remount, a refresh) therefore share one project.
    const { data: emptyRows } = await supabase
      .from("pvg_projects")
      .select(PROJECT_COLUMNS)
      .eq("user_id", userId)
      .eq("status", "draft")
      .is("deleted_at", null)
      .is("delivered_at", null)
      .order("created_at", { ascending: true })
      .limit(10);
    for (const row of (emptyRows ?? []) as ProjectRow[]) {
      const candidate = await loadProject(supabase, row.id);
      if (
        candidate &&
        !candidate.scenes.length &&
        !candidate.people.length &&
        !(candidate.sceneDescription ?? "").trim() &&
        (candidate.creditsCharged ?? 0) === 0
      ) {
        return { project: candidate, balance: await walletBalance(supabase, userId) };
      }
    }
    const { data: created, error } = await supabase
      .from("pvg_projects")
      .insert({ user_id: userId, generations_limit: pvgIncludedGenerations(0) })
      .select(PROJECT_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    const mine = created as ProjectRow;

    // Two calls can pass the check above at the very same moment and each add
    // an empty draft — twins. Both then agree on the oldest of the two, so the
    // greeting, the voice and the film always belong to ONE project. The extra
    // record is put aside at once, never left behind for the person to find.
    const { data: twins } = await supabase
      .from("pvg_projects")
      .select(PROJECT_COLUMNS)
      .eq("user_id", userId)
      .eq("status", "draft")
      .is("deleted_at", null)
      .is("delivered_at", null)
      .order("created_at", { ascending: true })
      .limit(10);
    const blanks = ((twins ?? []) as ProjectRow[]).filter(
      (row) => !((row as { scene_description?: string | null }).scene_description ?? "").trim(),
    );
    const winner =
      [...blanks].sort((a, b) =>
        a.created_at === b.created_at
          ? a.id.localeCompare(b.id)
          : String(a.created_at).localeCompare(String(b.created_at)),
      )[0] ?? mine;
    if (winner.id !== mine.id) {
      const kept = await loadProject(supabase, winner.id);
      if (kept && !kept.scenes.length && !kept.people.length && (kept.creditsCharged ?? 0) === 0) {
        await supabase
          .from("pvg_projects")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", mine.id);
        return { project: kept, balance: await walletBalance(supabase, userId) };
      }
    }
    return {
      project: { ...toProjectShell(mine), people: [], scenes: [] } as PvgProject,
      balance: await walletBalance(supabase, userId),
    };
  });

/** Every unfinished and finished project of this person. */
export const listPvgProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("pvg_projects")
      .select(PROJECT_COLUMNS)
      .is("deleted_at", null)
      .is("delivered_at", null)
      .order("updated_at", { ascending: false })
      .limit(50);
    const rows = (data ?? []) as ProjectRow[];
    const projects = await Promise.all(
      rows.map(async (row) => {
        const [{ count: peopleCount }, { data: scenes }] = await Promise.all([
          context.supabase
            .from("pvg_people")
            .select("id", { count: "exact", head: true })
            .eq("project_id", row.id),
          context.supabase
            .from("pvg_scenes")
            .select(SCENE_COLUMNS)
            .eq("project_id", row.id)
            .eq("status", "ready")
            .order("variation_index")
            .limit(1),
        ]);
        const first = ((scenes ?? []) as SceneRow[])[0];
        return {
          ...toProjectShell(row),
          peopleCount: peopleCount ?? 0,
          coverUrl: first ? (await toScene(first)).imageUrl : null,
        };
      }),
    );
    return projects;
  });

/**
 * Leaving the workflow never destroys anything: the order keeps its id and
 * moves to the recycle bin for the configured retention period.
 */
export const deletePvgProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: owned } = await supabase
      .from("pvg_projects")
      .select("id, user_id, deleted_at")
      .eq("id", data.projectId)
      .maybeSingle();
    const row = owned as { id: string; user_id: string; deleted_at: string | null } | null;
    if (!row || row.user_id !== userId) throw new Error("project_not_found");
    if (row.deleted_at) return { ok: true as const };

    const { readRetentionDays } = await import("./order.server");
    const days = await readRetentionDays();
    const now = Date.now();
    const { error } = await supabase
      .from("pvg_projects")
      .update({
        deleted_at: new Date(now).toISOString(),
        purge_after: new Date(now + days * 86_400_000).toISOString(),
        status: "deleted_by_user",
      })
      .eq("id", row.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const savePvgProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SaveInput) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("pvg_projects")
      .update({
        recipient_name: data.recipientName.slice(0, 120),
        occasion: data.occasion.slice(0, 120),
        scene_description: data.sceneDescription.slice(0, 4000),
        workflow_step: data.workflowStep ?? "scene",
      })
      .eq("id", data.projectId)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
    const { recordVersion } = await import("./order.server");
    const version = await recordVersion(data.projectId);
    return { ok: true as const, version, savedAt: new Date().toISOString() };
  });

/** Adds a person, or replaces the picture of an existing person. */
export const savePvgPerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: PhotoInput) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { pvgPhotoBucket } = await import("./env.server");
    const bucket = pvgPhotoBucket();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: owned } = await supabase
      .from("pvg_projects")
      .select("id")
      .eq("id", data.projectId)
      .maybeSingle();
    if (!owned) throw new Error("project_not_found");

    if (!data.personId) {
      const { count } = await supabase
        .from("pvg_people")
        .select("id", { count: "exact", head: true })
        .eq("project_id", data.projectId)
        .eq("role", "speaker");
      if ((count ?? 0) >= PVG_MAX_ADDED_PEOPLE) throw new Error("people_limit");
    }

    const ext = extensionFor(data.contentType);
    const base = `${userId}/${data.projectId}/${crypto.randomUUID()}`;
    const optimizedPath = `${base}-optimized.${ext}`;
    const up = await supabaseAdmin.storage
      .from(bucket)
      .upload(optimizedPath, bytesFromBase64(data.optimizedBase64), {
        contentType: data.contentType,
        upsert: false,
      });
    if (up.error) throw new Error(up.error.message);

    // The picture exactly as it was uploaded is kept safely; only the
    // lightweight copy above ever reaches the picture engine.
    let originalPath: string | null = null;
    if (data.originalBase64) {
      originalPath = `${base}-original.${ext}`;
      const orig = await supabaseAdmin.storage
        .from(bucket)
        .upload(originalPath, bytesFromBase64(data.originalBase64), {
          contentType: data.contentType,
          upsert: false,
        });
      if (orig.error) originalPath = null;
    }

    const values = {
      optimized_bucket: bucket,
      optimized_path: optimizedPath,
      original_bucket: originalPath ? bucket : null,
      original_path: originalPath,
      face_quality: data.faceQuality ?? "unknown",
      source: data.source ?? "individual",
      role: "speaker",
      ...(data.name === undefined ? {} : { name: data.name.slice(0, 80) }),
    };

    if (data.personId) {
      const { error } = await supabase.from("pvg_people").update(values).eq("id", data.personId);
      if (error) throw new Error(error.message);
    } else {
      const { count } = await supabase
        .from("pvg_people")
        .select("id", { count: "exact", head: true })
        .eq("project_id", data.projectId);
      const { error } = await supabase.from("pvg_people").insert({
        project_id: data.projectId,
        user_id: userId,
        position: count ?? 0,
        ...values,
      });
      if (error) throw new Error(error.message);
    }
    return { project: await loadProject(supabase, data.projectId) };
  });

/** Keeps an extra picture of a person for later quality improvements. */
export const addPvgPersonPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { projectId: string; personId: string; base64: string; contentType: string }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { pvgPhotoBucket } = await import("./env.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bucket = pvgPhotoBucket();
    const path = `${userId}/${data.projectId}/${crypto.randomUUID()}-extra.${extensionFor(data.contentType)}`;
    const up = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, bytesFromBase64(data.base64), { contentType: data.contentType, upsert: false });
    if (up.error) throw new Error(up.error.message);

    const { data: person } = await supabase
      .from("pvg_people")
      .select("id, extra_photos")
      .eq("id", data.personId)
      .maybeSingle();
    const raw = (person as { extra_photos?: unknown } | null)?.extra_photos;
    const current: { bucket: string; path: string }[] = Array.isArray(raw)
      ? (raw as unknown as { bucket: string; path: string }[])
      : [];
    await supabase
      .from("pvg_people")
      .update({ extra_photos: [...current, { bucket, path }] })
      .eq("id", data.personId);
    return { project: await loadProject(supabase, data.projectId) };
  });

export const renamePvgPerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string; personId: string; name: string }) => input)
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("pvg_people")
      .update({ name: data.name.slice(0, 80) })
      .eq("id", data.personId);
    return { ok: true as const };
  });

/**
 * The second way of adding the one main person: the customer describes them
 * in words instead of uploading a photo. Project Joy then creates that person
 * inside the starting scene.
 */
export const savePvgPersonDescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      projectId: string;
      personId?: string | undefined;
      name?: string | undefined;
      appearanceDescription: string;
    }) => input,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: owned } = await supabase
      .from("pvg_projects")
      .select("id")
      .eq("id", data.projectId)
      .maybeSingle();
    if (!owned) throw new Error("project_not_found");

    const description = data.appearanceDescription.slice(0, 600);
    if (data.personId) {
      const { error } = await supabase
        .from("pvg_people")
        .update({
          appearance_description: description,
          ...(data.name === undefined ? {} : { name: data.name.slice(0, 80) }),
        })
        .eq("id", data.personId);
      if (error) throw new Error(error.message);
    } else {
      const { count } = await supabase
        .from("pvg_people")
        .select("id", { count: "exact", head: true })
        .eq("project_id", data.projectId)
        .eq("role", "speaker");
      if ((count ?? 0) >= PVG_MAX_ADDED_PEOPLE) throw new Error("people_limit");
      const { error } = await supabase.from("pvg_people").insert({
        project_id: data.projectId,
        user_id: userId,
        position: 0,
        role: "speaker",
        source: "individual",
        face_quality: "good",
        appearance_description: description,
        ...(data.name === undefined ? {} : { name: data.name.slice(0, 80) }),
      });
      if (error) throw new Error(error.message);
    }
    return { project: await loadProject(supabase, data.projectId) };
  });

/**
 * A scene without a specially added person still needs one voice for the
 * greeting. It is kept on an invisible carrier row so the voice tools of page
 * two keep working unchanged. It is never a speaking character.
 */
export const ensurePvgVoiceCarrier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: owned } = await supabase
      .from("pvg_projects")
      .select("id, user_id")
      .eq("id", data.projectId)
      .maybeSingle();
    const row = owned as { id: string; user_id: string } | null;
    if (!row || row.user_id !== userId) throw new Error("project_not_found");

    const { data: existing } = await supabase
      .from("pvg_people")
      .select("id, role")
      .eq("project_id", data.projectId);
    const rows = (existing ?? []) as { id: string; role: string | null }[];
    if (rows.length === 0) {
      await supabase.from("pvg_people").insert({
        project_id: data.projectId,
        user_id: userId,
        position: 0,
        role: "narrator",
        source: "individual",
        face_quality: "unknown",
      });
    }
    return { project: await loadProject(supabase, data.projectId) };
  });

export const removePvgPerson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string; personId: string }) => input)
  .handler(async ({ data, context }) => {
    await context.supabase.from("pvg_people").delete().eq("id", data.personId);
    return { project: await loadProject(context.supabase, data.projectId) };
  });

/**
 * Starts one starting-scene creation. The project is checked again here, the
 * single payment is taken on the first creation, and the render then runs in
 * the background so the page is free again immediately.
 */
/**
 * Buys one package of three starting-scene attempts for a single credit. The
 * wallet and the order are locked inside the database, so a double click, a
 * refresh or a repeated request can never take a second credit, and a package
 * that still holds unused attempts is never paid for twice.
 */
export const buyPvgScenePack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("buy_pvg_scene_pack", {
      _user_id: userId,
      _project_id: data.projectId,
      _price: PVG_SCENE_PACK_CREDITS,
    });
    const payload = (result ?? {}) as { ok?: boolean; error?: string; balance?: number };
    const project = await loadProject(supabase, data.projectId);
    if (error || !payload.ok) {
      return {
        ok: false as const,
        issues: [{ field: "credits", key: "pvg_err_credits" }],
        project,
        balance: payload.balance ?? (await walletBalance(supabase, userId)),
      };
    }
    return {
      ok: true as const,
      issues: [] as { field: string; key: string }[],
      project,
      balance: payload.balance ?? (await walletBalance(supabase, userId)),
    };
  });

export const generatePvgScene = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const project = await loadProject(supabase, data.projectId);
    if (!project) throw new Error("project_not_found");

    const balance = await walletBalance(supabase, userId);
    const issues = validatePvgProject(project, balance);
    if (issues.length > 0) {
      // A paid request is never sent when anything is still missing.
      return { ok: false as const, issues, project, balance };
    }

    const used = successfulScenes(project);
    const added = addedPeople(project.people);
    const included = pvgIncludedGenerations(added.length);

    // One request at a time: repeated clicks never start a second render.
    if (project.scenes.some((s) => s.status === "pending" || s.status === "processing")) {
      return {
        ok: true as const,
        issues: [] as { field: string; key: string }[],
        project,
        balance,
      };
    }

    // Attempts are bought in packages of three. Nothing is charged here, so a
    // refresh, a retry or a double click can never take a credit twice.
    const attempts = pvgSceneAttempts(used, project.scenePacks);
    if (attempts.remaining <= 0) {
      return {
        ok: false as const,
        issues: [{ field: "generations", key: "pvg_attempts_empty" }],
        project,
        balance,
      };
    }

    // The stored index stays unique per project, also across failed attempts.
    const variationIndex =
      project.scenes.reduce((max, s) => Math.max(max, s.variationIndex), 0) + 1;

    // The scene is always built from the customer's own words. Only a person
    // who was specially added is described on top of it; anybody else the
    // description mentions simply belongs to the scene.
    const main = added[0] ?? null;
    const mainName = main?.name.trim() || "the main person";
    const withPhoto = Boolean(main?.photoUrl);
    const prompt = [
      project.sceneDescription.trim(),
      main
        ? withPhoto
          ? `One main person is present in this scene: ${mainName}. Keep this face true to the supplied portrait. Any other people belong to the described scene.`
          : `One main person is present in this scene: ${mainName} — ${main.appearanceDescription.trim()}. Show this person clearly in the foreground, facing the camera. Any other people belong to the described scene.`
        : "",
      "A warm, premium celebration scene, cinematic lighting, photo-real, wide framing.",
      wantsVisibleText(project.sceneDescription) ? "" : NO_TEXT_INSTRUCTION,
    ]
      .filter(Boolean)
      .join(" ");

    const { data: sceneRow, error: sceneError } = await supabase
      .from("pvg_scenes")
      .insert({
        project_id: project.id,
        user_id: userId,
        variation_index: variationIndex,
        status: "pending",
        prompt,
      })
      .select(SCENE_COLUMNS)
      .single();
    if (sceneError) throw new Error(sceneError.message);

    await supabase
      .from("pvg_projects")
      .update({
        generations_used: used + 1,
        generations_limit: included,
        status: "generating",
      })
      .eq("id", project.id);

    try {
      const referenceUrls = added
        .map((p) => p.photoUrl)
        .filter((url): url is string => Boolean(url));
      const { startSceneRender } = await import("./generator/image-engine.server");
      const started = await startSceneRender({ prompt, referenceUrls });
      await supabase
        .from("pvg_scenes")
        .update({
          status: "processing",
          prediction_id: started.predictionId,
          generator_key: started.engineKey,
          generator_model: started.model,
        })
        .eq("id", (sceneRow as SceneRow).id);
    } catch (err) {
      await supabase
        .from("pvg_scenes")
        .update({
          status: "failed",
          error_code: "engine_error",
          error_message:
            err instanceof Error ? err.message.slice(0, 300) : "The engine refused the request.",
        })
        .eq("id", (sceneRow as SceneRow).id);
      // A technical failure uses up neither an included nor a paid scene.
      await syncGenerationsUsed(supabase, project.id, used);
    }

    const refreshed = await loadProject(supabase, project.id);
    return {
      ok: true as const,
      issues: [] as { field: string; key: string }[],
      project: refreshed,
      balance: await walletBalance(supabase, userId),
    };
  });

/** Reloads a project and completes any starting scene the engine has finished. */
export const refreshPvgProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: running } = await supabase
      .from("pvg_scenes")
      .select("id")
      .eq("project_id", data.projectId)
      .in("status", ["pending", "processing"]);
    await Promise.all(
      ((running ?? []) as { id: string }[]).map((row) => reconcileScene(row.id)),
    );
    let project = await loadProject(supabase, data.projectId);
    if (project) {
      const used = successfulScenes(project);
      if (used !== project.generationsUsed) {
        await syncGenerationsUsed(supabase, data.projectId, used);
        project = { ...project, generationsUsed: used };
      }
    }
    return { project, balance: await walletBalance(supabase, userId) };
  });

/** Marks the chosen variation as the first frame of the future greeting. */
export const selectPvgScene = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string; sceneId: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("pvg_projects")
      .update({ selected_scene_id: data.sceneId, status: "scene_selected" })
      .eq("id", data.projectId);
    if (error) throw new Error(error.message);
    return { project: await loadProject(context.supabase, data.projectId) };
  });
