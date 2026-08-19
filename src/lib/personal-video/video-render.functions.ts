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
  voice_id: string | null;
  role?: string | null;
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
    const running = rows.filter((r) =>
      ["pending", "processing", "lipsync", "assets"].includes(r.status),
    );
    if (running.length > 0) {
      await Promise.all(running.map((row) => reconcileVideo(row.id)));
      rows = await read();
    }

    const { data: wallet } = await supabase
      .from("credit_wallets")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();

    // Films the customer already downloaded or shared are kept in the archive
    // but leave the active page. Pricing still counts them.
    const everReady = rows.some((r) => r.status === "ready");
    const active = rows.filter((r) => !r.delivered_at);
    const variants = await Promise.all(active.map((row) => toVideoJob(row)));
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
      nextPrice: everReady ? PVR_REGENERATION_CREDITS : videoCredits(seconds),
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
        .in("status", ["pending", "processing", "lipsync", "assets"])
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

      // Who is in this order: the one specially added person, if any. People
      // that merely appear because the scene was described that way are not
      // stored here and never become speaking characters.
      const { data: peopleRows } = await supabase
        .from("pvg_people")
        .select("id, name, position, voice_id, role")
        .eq("project_id", project.id)
        .order("position", { ascending: true });
      const people = (peopleRows ?? []) as PersonLite[];
      const addedPersons = people.filter((p) => (p.role ?? "speaker") === "speaker");
      const speaker =
        addedPersons.find((p) => p.id === project.single_speaker_person_id) ??
        addedPersons[0] ??
        null;

      // Automatic routing. No designated speaker means the film belongs to the
      // scene route, whose engine slot is prepared but not connected yet.
      if (!speaker) {
        return {
          ok: false,
          error: "pvr_err_no_person_engine",
          video: null,
          balance: await balanceOf(),
        };
      }

      const duration = clampDuration(project.video_duration_seconds ?? 10);
      const sceneSounds = Boolean(project.scene_sounds);
      const isAgain = ready.length > 0;
      const price = isAgain
        ? PVR_REGENERATION_CREDITS
        : videoCredits(duration) + (sceneSounds ? sceneSoundCredits(duration) : 0);

      // The finished greeting voice from page two is what the film is built
      // on. It is sent once, and never laid over the result again.
      const { readVoiceover } = await import("./voice/voice.server");
      const voiceover = await readVoiceover(project.id);
      const audioUrl = voiceover?.audioUrl ?? null;
      if (!audioUrl) {
        return { ok: false, error: "pvr_err_no_voice", video: null, balance: await balanceOf() };
      }
      // The greeting itself is never stretched or slowed: the chosen slider
      // length is the length of the finished film, and a greeting that is
      // shorter simply leaves a quiet, naturally animated ending.
      const spokenSeconds = Number(voiceover?.durationSeconds ?? 0);
      const audioSeconds = Math.max(spokenSeconds, duration);
      const { maxGreetingAudioSeconds } = await import("./generator/pipeline.server");
      const maxAudio = maxGreetingAudioSeconds();
      if (audioSeconds > maxAudio) {
        return {
          ok: false,
          error: "pvr_err_audio_too_long",
          video: null,
          balance: await balanceOf(),
        };
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

      const named = (p: PersonLite, i: number) =>
        p.name?.trim() ? p.name.trim() : `Person ${i + 1}`;

      // Kling's prompt field is positive-only and should contain English
      // motion direction, not untranslated prose or negative text concepts.
      const { translatePromptToEnglish } = await import("@/lib/ai/prompt-translate.server");
      const translatedAction = await translatePromptToEnglish(
        project.action_description ?? "",
        "animation",
      );
      const { buildVideoPrompt } = await import("./generator/video-prompt");
      const prompt = buildVideoPrompt({
        actionDescription: translatedAction.english,
        speakerName: named(speaker, addedPersons.indexOf(speaker)),
        speakerIndex: addedPersons.indexOf(speaker),
        totalPeople: addedPersons.length,
        silentNames: [],
      });

      const variantIndex =
        ready.length > 0 ? Math.max(...ready.map((r) => r.variant_index ?? 1)) + 1 : 1;
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
          audio_seconds: audioSeconds,
          speaker_person_id: speaker?.id ?? null,
        } as never)
        .select(VIDEO_COLUMNS)
        .single();
      if (createError) throw new Error(createError.message);
      const videoRow = created as Row;

      try {
        // Picture + finished greeting voice in, speaking film out.
        // The sound handed over always lasts the full chosen length: the
        // greeting exactly as it was spoken, followed by silence. The engine
        // then keeps the same scene alive, calm and speechless, to the end.
        let renderAudioUrl = audioUrl;
        if (duration > spokenSeconds + 0.25) {
          const { padAudioToDuration } = await import("./generator/audio-tail.server");
          const { storeRenderAudio } = await import("./voice/voice.server");
          const padded = await padAudioToDuration(audioUrl, spokenSeconds, duration);
          if (padded) {
            const stored = await storeRenderAudio(project.id, userId, padded);
            if (stored) renderAudioUrl = stored;
          }
        }
        const { startFinalVideo } = await import("./generator/pipeline.server");
        const started = await startFinalVideo({
          prompt,
          imageUrl,
          audioUrl: renderAudioUrl,
          audioSeconds,
          seed,
        });
        await supabaseAdmin
          .from("pvg_videos")
          .update({
            status: "processing",
            prediction_id: started.predictionId,
            generator_key: started.engineKey,
            generator_model: started.model,
            video_prediction_id: started.predictionId,
            video_generator_key: started.engineKey,
            video_generator_model: started.model,
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

/**
 * Everything the page needs to write the finished sound into the film: the
 * original speech-only film, and a place to put the mixed result. The mix is
 * always built from the untouched original, never from an earlier mix.
 */
export const preparePvgVideoMix = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string; videoId: string }) => input)
  .handler(
    async ({
      data,
      context,
    }): Promise<{
      ok: boolean;
      sourceUrl: string | null;
      path: string | null;
      token: string | null;
    }> => {
      const { supabase, userId } = context;
      const { data: row } = await supabase
        .from("pvg_videos")
        .select("id, project_id, user_id, status, storage_bucket, storage_path")
        .eq("id", data.videoId)
        .maybeSingle();
      const video = row as {
        id: string;
        project_id: string;
        user_id: string;
        status: string;
        storage_bucket: string | null;
        storage_path: string | null;
      } | null;
      if (!video || video.user_id !== userId || video.project_id !== data.projectId) {
        throw new Error("video_not_found");
      }
      if (video.status !== "ready" || !video.storage_bucket || !video.storage_path) {
        return { ok: false, sourceUrl: null, path: null, token: null };
      }
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { pvgSignedUrlTtl } = await import("./env.server");
      const source = await supabaseAdmin.storage
        .from(video.storage_bucket)
        .createSignedUrl(video.storage_path, pvgSignedUrlTtl());
      const path = `${userId}/${video.project_id}/mix-${video.id}.mp4`;
      // A new mix always replaces the previous one for this film.
      await supabaseAdmin.storage.from(video.storage_bucket).remove([path]);
      const upload = await supabaseAdmin.storage
        .from(video.storage_bucket)
        .createSignedUploadUrl(path);
      if (upload.error || !source.data?.signedUrl) {
        return { ok: false, sourceUrl: null, path: null, token: null };
      }
      return {
        ok: true,
        sourceUrl: source.data.signedUrl,
        path,
        token: upload.data.token,
      };
    },
  );

/** Records the mixed film as the one the page and the download must use. */
export const attachPvgVideoMix = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string; videoId: string; path: string; signature: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("pvg_videos")
      .select("id, project_id, user_id")
      .eq("id", data.videoId)
      .maybeSingle();
    const video = row as { id: string; project_id: string; user_id: string } | null;
    if (!video || video.user_id !== userId || video.project_id !== data.projectId) {
      throw new Error("video_not_found");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("pvg_videos")
      .update({ mix_storage_path: data.path, mix_signature: data.signature } as never)
      .eq("id", video.id);
    return { mixed: true as const };
  });

/**
 * The customer has taken the film home — downloaded it or handed it to the
 * device's own sharing. The film stays safely stored; it simply leaves the
 * active page. Nothing is deleted and no credit is touched.
 */
export const markPvgVideoDelivered = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string; videoId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("pvg_videos")
      .select("id, project_id, user_id")
      .eq("id", data.videoId)
      .maybeSingle();
    const video = row as { id: string; project_id: string; user_id: string } | null;
    if (!video || video.user_id !== userId || video.project_id !== data.projectId) {
      throw new Error("video_not_found");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("pvg_videos")
      .update({ delivered_at: new Date().toISOString() } as never)
      .eq("id", video.id);
    // The whole order is finished: it leaves the workflow and the cabinet.
    await supabaseAdmin
      .from("pvg_projects")
      .update({ delivered_at: new Date().toISOString(), status: "completed" } as never)
      .eq("id", video.project_id);
    return { delivered: true as const };
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
