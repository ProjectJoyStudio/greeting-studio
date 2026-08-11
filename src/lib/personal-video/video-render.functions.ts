import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { PvgVideoJob } from "./video-render";
import { PVR_REGENERATION_CREDITS } from "./video-render";
import { clampDuration, sceneSoundCredits, videoCredits } from "./video-setup";

interface ProjectRowLite {
  id: string;
  user_id: string;
  recipient_name: string | null;
  occasion: string | null;
  scene_description: string | null;
  action_description: string | null;
  video_duration_seconds: number | null;
  scene_sounds: boolean | null;
  selected_scene_id: string | null;
  credits_charged: number;
  speech_mode: string | null;
  single_speaker_person_id: string | null;
}

interface PersonLite {
  id: string;
  name: string | null;
  position: number;
  part_text: string | null;
  voice_id: string | null;
}

export interface PvgVideoState {
  /** Every film of this order, newest first. */
  variants: PvgVideoJob[];
  /** The newest film — the one whose progress is followed. */
  video: PvgVideoJob | null;
  selectedId: string | null;
  balance: number;
  /** What the next film costs: full price at first, then the fixed price. */
  nextPrice: number;
  hasReady: boolean;
}

/** Every film of one order, finished in the background when needed. */
export const getPvgVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string }) => input)
  .handler(async ({ data, context }): Promise<PvgVideoState> => {
    const { supabase, userId } = context;
    const { VIDEO_COLUMNS, reconcileVideo, toVideoJob } = await import("./video-render.server");
    type Row = import("./video-render.server").VideoRow;

    const read = async (): Promise<Row[]> => {
      const { data: rows } = await supabase
        .from("pvg_videos")
        .select(VIDEO_COLUMNS)
        .eq("project_id", data.projectId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      return (rows ?? []) as Row[];
    };

    let rows = await read();
    const running = rows.filter((r) => ["pending", "processing", "assets"].includes(r.status));
    if (running.length > 0) {
      for (const row of running) await reconcileVideo(row.id);
      rows = await read();
    }

    const { data: wallet } = await supabase
      .from("credit_wallets")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    const variants = await Promise.all(rows.map((row) => toVideoJob(row)));
    const ready = variants.filter((v) => v.status === "ready");
    const project = await supabase
      .from("pvg_projects")
      .select("video_duration_seconds")
      .eq("id", data.projectId)
      .maybeSingle();
    const seconds = clampDuration(
      (project.data as { video_duration_seconds: number | null } | null)?.video_duration_seconds ??
        10,
    );
    return {
      variants,
      video: variants[0] ?? null,
      selectedId: (ready.find((v) => v.isSelected) ?? ready[0])?.id ?? null,
      balance: (wallet as { balance: number } | null)?.balance ?? 0,
      nextPrice: ready.length > 0 ? PVR_REGENERATION_CREDITS : videoCredits(seconds),
      hasReady: ready.length > 0,
    };
  });

async function loadRow(supabase: unknown, id: string) {
  const { VIDEO_COLUMNS } = await import("./video-render.server");
  const client = supabase as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: unknown }> };
      };
    };
  };
  const { data } = await client.from("pvg_videos").select(VIDEO_COLUMNS).eq("id", id).maybeSingle();
  return data as import("./video-render.server").VideoRow | null;
}

/**
 * Confirms the order and starts one film. The first film costs one credit per
 * second; every further variant of the same order costs a fixed five credits.
 * Credits are taken exactly once, here, and returned whenever a film fails.
 */
export const startPvgVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string; again?: boolean | undefined }) => input)
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      ok: boolean;
      error?: string;
      video: PvgVideoJob | null;
      balance: number;
    }> => {
      const { supabase, userId } = context;
      const { VIDEO_COLUMNS, toVideoJob } = await import("./video-render.server");

      const { data: projectRow } = await supabase
        .from("pvg_projects")
        .select(
          "id, user_id, recipient_name, occasion, scene_description, action_description, video_duration_seconds, scene_sounds, selected_scene_id, credits_charged, speech_mode, single_speaker_person_id",
        )
        .eq("id", data.projectId)
        .maybeSingle();
      const project = projectRow as ProjectRowLite | null;
      if (!project || project.user_id !== userId) throw new Error("project_not_found");

      const balanceOf = async () => {
        const { data: wallet } = await supabase
          .from("credit_wallets")
          .select("balance")
          .eq("user_id", userId)
          .maybeSingle();
        return (wallet as { balance: number } | null)?.balance ?? 0;
      };

      type Row = import("./video-render.server").VideoRow;

      // One film at a time: a second click never starts a second paid render.
      const { data: runningRow } = await supabase
        .from("pvg_videos")
        .select(VIDEO_COLUMNS)
        .eq("project_id", project.id)
        .in("status", ["pending", "processing", "assets"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const running = runningRow as Row | null;
      if (running) {
        return { ok: true, video: await toVideoJob(running), balance: await balanceOf() };
      }

      const { data: readyRows } = await supabase
        .from("pvg_videos")
        .select(VIDEO_COLUMNS)
        .eq("project_id", project.id)
        .eq("status", "ready")
        .order("created_at", { ascending: false });
      const ready = (readyRows ?? []) as Row[];
      // Without an explicit wish for another film, the finished one is shown.
      if (ready.length > 0 && !data.again) {
        return { ok: true, video: await toVideoJob(ready[0]!), balance: await balanceOf() };
      }

      // The approved starting scene is the first frame of the film.
      const { data: sceneRow } = await supabase
        .from("pvg_scenes")
        .select("id, storage_bucket, storage_path, status")
        .eq("project_id", project.id)
        .eq("status", "ready")
        .order("variation_index", { ascending: false })
        .limit(20);
      const scenes = (sceneRow ?? []) as {
        id: string;
        storage_bucket: string | null;
        storage_path: string | null;
      }[];
      const chosen = scenes.find((s) => s.id === project.selected_scene_id) ?? scenes[0] ?? null;
      if (!chosen?.storage_bucket || !chosen.storage_path) {
        return { ok: false, error: "pvr_err_no_scene", video: null, balance: await balanceOf() };
      }
      const { signedUrl } = await import("./pvg.server");
      const imageUrl = await signedUrl(chosen.storage_bucket, chosen.storage_path);
      if (!imageUrl) {
        return { ok: false, error: "pvr_err_no_scene", video: null, balance: await balanceOf() };
      }

      const duration = clampDuration(project.video_duration_seconds ?? 10);
      const sceneSounds = Boolean(project.scene_sounds);
      const isAgain = ready.length > 0;
      const price = isAgain
        ? PVR_REGENERATION_CREDITS
        : videoCredits(duration) + (sceneSounds ? sceneSoundCredits(duration) : 0);

      // The greeting voice already prepared on page two drives the speaking.
      // It is never added a second time afterwards.
      const { readVoiceover } = await import("./voice/voice.server");
      const voiceover = await readVoiceover(project.id);
      const audioUrl = voiceover?.audioUrl ?? null;
      if (!audioUrl) {
        return { ok: false, error: "pvr_err_no_voice", video: null, balance: await balanceOf() };
      }

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: walletRow } = await supabaseAdmin
        .from("credit_wallets")
        .select("id, balance, lifetime_spent")
        .eq("user_id", userId)
        .maybeSingle();
      const w = walletRow as { id: string; balance: number; lifetime_spent: number } | null;
      if (!w || w.balance < price) {
        return { ok: false, error: "pvr_err_credits", video: null, balance: w?.balance ?? 0 };
      }
      // Conditional write: two clicks can never take the same credits twice.
      const { data: charged } = await supabaseAdmin
        .from("credit_wallets")
        .update({ balance: w.balance - price, lifetime_spent: w.lifetime_spent + price })
        .eq("id", w.id)
        .eq("balance", w.balance)
        .select("id")
        .maybeSingle();
      if (!charged) {
        return { ok: false, error: "pvr_err_credits", video: null, balance: await balanceOf() };
      }
      await supabaseAdmin.from("credit_transactions").insert({
        wallet_id: w.id,
        user_id: userId,
        txn_type: "order_charge",
        amount: -price,
        balance_after: w.balance - price,
        description: isAgain
          ? "Personal video greeting — another film of the same order"
          : "Personal video greeting — the film",
        metadata: {
          project_id: project.id,
          seconds: duration,
          scene_sounds: sceneSounds,
          regeneration: isAgain,
        },
      });
      await supabaseAdmin
        .from("pvg_projects")
        .update({
          credits_charged: (project.credits_charged ?? 0) + price,
          status: "video_generating",
        } as never)
        .eq("id", project.id);

      // Who speaks, and who only smiles, comes from this order's own people.
      const { data: peopleRows } = await supabase
        .from("pvg_people")
        .select("id, name, position, part_text, voice_id")
        .eq("project_id", project.id)
        .order("position", { ascending: true });
      const people = (peopleRows ?? []) as PersonLite[];
      const speechMode =
        project.speech_mode === "parts" || project.speech_mode === "chorus"
          ? project.speech_mode
          : "single";
      const named = (p: PersonLite, i: number) => (p.name?.trim() ? p.name.trim() : `Person ${i + 1}`);
      let speakers: PersonLite[];
      if (speechMode === "single") {
        const one =
          people.find((p) => p.id === project.single_speaker_person_id) ?? people[0] ?? null;
        speakers = one ? [one] : [];
      } else if (speechMode === "parts") {
        speakers = people.filter((p) => (p.part_text ?? "").trim().length > 0);
        if (speakers.length === 0) speakers = people;
      } else {
        speakers = people.filter((p) => Boolean(p.voice_id));
        if (speakers.length === 0) speakers = people;
      }
      const speakerIds = new Set(speakers.map((p) => p.id));

      const { buildVideoPrompt } = await import("./generator/video-prompt");
      const prompt = buildVideoPrompt({
        actionDescription: project.action_description ?? "",
        occasion: project.occasion ?? "",
        speechMode,
        speakerNames: speakers.map((p) => named(p, people.indexOf(p))),
        silentNames: people.filter((p) => !speakerIds.has(p.id)).map((p, i) => named(p, i)),
      });

      const variantIndex =
        ready.length > 0
          ? Math.max(...ready.map((r) => r.variant_index ?? 1)) + 1
          : 1;
      // A fresh seed makes every further film a genuinely new variation.
      const seed = Math.floor(Math.random() * 2_147_483_647);

      const { data: created, error: createError } = await supabaseAdmin
        .from("pvg_videos")
        .insert({
          project_id: project.id,
          user_id: userId,
          job_id: `pvg-${project.id}-${Date.now()}`,
          status: "pending",
          duration_seconds: duration,
          scene_sounds: sceneSounds,
          credits_charged: price,
          variant_index: variantIndex,
          action_description: project.action_description ?? "",
          seed,
        } as never)
        .select(VIDEO_COLUMNS)
        .single();
      if (createError) throw new Error(createError.message);
      const videoRow = created as Row;

      try {
        const { startVideoRender } = await import("./generator/video-engine.server");
        const started = await startVideoRender({
          prompt,
          imageUrl,
          audioUrl,
          durationSeconds: duration,
          sceneSounds,
          seed,
        });
        await supabaseAdmin
          .from("pvg_videos")
          .update({
            status: "processing",
            prediction_id: started.predictionId,
            generator_key: started.engineKey,
            generator_model: started.model,
          } as never)
          .eq("id", videoRow.id);
      } catch (err) {
        await supabaseAdmin
          .from("pvg_videos")
          .update({
            status: "failed",
            error_code: "engine_error",
            error_message:
              err instanceof Error ? err.message.slice(0, 300) : "The engine refused the request.",
          } as never)
          .eq("id", videoRow.id);
        const { refundVideo } = await import("./video-render.server");
        await refundVideo(videoRow, "engine_error");
        return {
          ok: false,
          error: "pvr_err_generic",
          video: await toVideoJob({ ...videoRow, status: "failed", credits_charged: 0 }),
          balance: await balanceOf(),
        };
      }

      const fresh = await loadRow(supabase, videoRow.id);
      return {
        ok: true,
        video: fresh ? await toVideoJob(fresh) : await toVideoJob(videoRow),
        balance: await balanceOf(),
      };
    },
  );

/** Choosing between films that already exist never costs a credit. */
export const selectPvgVideoVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string; videoId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("pvg_videos")
      .select("id, project_id, user_id, status")
      .eq("id", data.videoId)
      .maybeSingle();
    const video = row as {
      id: string;
      project_id: string;
      user_id: string;
      status: string;
    } | null;
    if (!video || video.user_id !== userId || video.project_id !== data.projectId) {
      throw new Error("video_not_found");
    }
    const { markSelectedVariant } = await import("./video-render.server");
    await markSelectedVariant(data.projectId, data.videoId);
    return { selected: true as const };
  });

/** After a failure the customer may try again; the failed film was refunded. */
export const retryPvgVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: project } = await supabase
      .from("pvg_projects")
      .select("id, user_id")
      .eq("id", data.projectId)
      .maybeSingle();
    const p = project as { id: string; user_id: string } | null;
    if (!p || p.user_id !== userId) throw new Error("project_not_found");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("pvg_videos").delete().eq("project_id", p.id).eq("status", "failed");
    return { cleared: true as const };
  });
