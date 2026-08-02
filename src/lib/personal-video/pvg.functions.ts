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
import { PVG_MAX_GENERATIONS, PVG_MAX_PEOPLE, pvgPriceCredits, validatePvgProject } from "./types";
import type { PvgProject } from "./types";
import { PERSONAL_VIDEO_GREETING_TEST_MODE } from "./test-mode";

// --- input shapes ----------------------------------------------------------

interface ProjectIdInput {
  projectId?: string | undefined;
}
interface SaveInput {
  projectId: string;
  recipientName: string;
  occasion: string;
  sceneDescription: string;
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
    .maybeSingle();
  const row = data as ProjectRow | null;
  if (!row) return null;

  const [{ data: peopleData }, { data: sceneData }] = await Promise.all([
    supabase.from("pvg_people").select(PERSON_COLUMNS).eq("project_id", projectId).order("position"),
    supabase.from("pvg_scenes").select(SCENE_COLUMNS).eq("project_id", projectId).order("variation_index"),
  ]);

  return {
    ...toProjectShell(row),
    people: await Promise.all(((peopleData ?? []) as PersonRow[]).map(toPerson)),
    scenes: await Promise.all(((sceneData ?? []) as SceneRow[]).map(toScene)),
  };
}

async function walletBalance(supabase: { from: (t: string) => any }, userId: string): Promise<number> {
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
    }
    const { data: created, error } = await supabase
      .from("pvg_projects")
      .insert({ user_id: userId, generations_limit: PVG_MAX_GENERATIONS })
      .select(PROJECT_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    return {
      project: { ...toProjectShell(created as ProjectRow), people: [], scenes: [] } as PvgProject,
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

/** Automatic draft saving after every change on the page. */
export const deletePvgProject = createServerFn({ method: "POST" })
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

    const { purgeProjectFiles } = await import("./pvg.server");
    await purgeProjectFiles(row.id);

    await supabase.from("pvg_scenes").delete().eq("project_id", row.id);
    await supabase.from("pvg_people").delete().eq("project_id", row.id);
    const { error } = await supabase.from("pvg_projects").delete().eq("id", row.id);
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
      })
      .eq("id", data.projectId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
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
        .eq("project_id", data.projectId);
      if ((count ?? 0) >= PVG_MAX_PEOPLE) throw new Error("people_limit");
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
  .inputValidator((input: { projectId: string; personId: string; base64: string; contentType: string }) => input)
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
      return { ok: false as const, issues, project };
    }

    const price = pvgPriceCredits(project.people.length);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Test mode of this section only: the price stays visible, but nothing is
    // taken from the balance. Turning the switch off restores this untouched.
    if (!PERSONAL_VIDEO_GREETING_TEST_MODE && project.creditsCharged === 0) {
      const { data: wallet } = await supabaseAdmin
        .from("credit_wallets")
        .select("id, balance, lifetime_spent")
        .eq("user_id", userId)
        .maybeSingle();
      const w = wallet as { id: string; balance: number; lifetime_spent: number } | null;
      if (!w || w.balance < price) {
        return { ok: false as const, issues: [{ field: "credits", key: "pvg_err_credits" }], project };
      }
      await supabaseAdmin
        .from("credit_wallets")
        .update({ balance: w.balance - price, lifetime_spent: w.lifetime_spent + price })
        .eq("id", w.id);
      await supabaseAdmin.from("credit_transactions").insert({
        wallet_id: w.id,
        user_id: userId,
        txn_type: "order_charge",
        amount: -price,
        balance_after: w.balance - price,
        description: "Personal video greeting — starting scene package",
        metadata: { project_id: project.id, people: project.people.length },
      });
      await supabase.from("pvg_projects").update({ credits_charged: price }).eq("id", project.id);
    }

    const used = successfulScenes(project);
    if (used >= project.generationsLimit) {
      return {
        ok: false as const,
        issues: [{ field: "generations", key: "pvg_err_generations" }],
        project,
      };
    }
    // The stored index stays unique per project, also across failed attempts.
    const variationIndex =
      project.scenes.reduce((max, s) => Math.max(max, s.variationIndex), 0) + 1;

    const people = project.people
      .map((p, i) => `${p.name.trim() || `person ${i + 1}`}`)
      .join(", ");
    const prompt = [
      project.sceneDescription.trim(),
      `The people in the scene: ${people}. Keep every face true to the supplied portraits.`,
      `A warm, premium celebration scene for ${project.occasion.trim()}, cinematic lighting, photo-real, wide framing.`,
    ].join(" ");

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
      .update({ generations_used: used + 1, status: "generating" })
      .eq("id", project.id);

    try {
      const referenceUrls = project.people
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
          error_message: err instanceof Error ? err.message.slice(0, 300) : "The engine refused the request.",
        })
        .eq("id", (sceneRow as SceneRow).id);
      // A technical failure does not use up one of the five generations.
      await syncGenerationsUsed(supabase, project.id, used);
    }

    const refreshed = await loadProject(supabase, project.id);
    return { ok: true as const, issues: [], project: refreshed };
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
    for (const row of (running ?? []) as { id: string }[]) await reconcileScene(row.id);
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