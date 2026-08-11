import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { PvgVideoJob } from "./video-render";
import { clampDuration, sceneSoundCredits, videoCredits } from "./video-setup";

interface ProjectRowLite {
  id: string;
  user_id: string;
  recipient_name: string | null;
  occasion: string | null;
  scene_description: string | null;
  video_duration_seconds: number | null;
  scene_sounds: boolean | null;
  selected_scene_id: string | null;
  credits_charged: number;
}

/** The newest film of one order, finished in the background when needed. */
export const getPvgVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string }) => input)
  .handler(async ({ data, context }): Promise<{ video: PvgVideoJob | null; balance: number }> => {
    const { supabase, userId } = context;
    const { VIDEO_COLUMNS, reconcileVideo, toVideoJob } = await import("./video-render.server");
    const { data: row } = await supabase
      .from("pvg_videos")
      .select(VIDEO_COLUMNS)
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    let current = row as Awaited<ReturnType<typeof loadRow>>;
    if (current && ["pending", "processing", "assets"].includes(current.status)) {
      await reconcileVideo(current.id);
      current = await loadRow(supabase, current.id);
    }
    const { data: wallet } = await supabase
      .from("credit_wallets")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();
    return {
      video: current ? await toVideoJob(current) : null,
      balance: (wallet as { balance: number } | null)?.balance ?? 0,
    };
  });

async function loadRow(supabase: unknown, id: string) {
  const { VIDEO_COLUMNS } = await import("./video-render.server");
  const client = supabase as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (
          c: string,
          v: string,
        ) => { maybeSingle: () => Promise<{ data: unknown }> };
      };
    };
  };
  const { data } = await client.from("pvg_videos").select(VIDEO_COLUMNS).eq("id", id).maybeSingle();
  return data as import("./video-render.server").VideoRow | null;
}

/**
 * Confirms the order and starts the film. The credits of this page are taken
 * exactly once, here, and returned in full whenever the film cannot be made.
 */
export const startPvgVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string }) => input)
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
          "id, user_id, recipient_name, occasion, scene_description, video_duration_seconds, scene_sounds, selected_scene_id, credits_charged",
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

      // One film at a time: a second click never starts a second paid render.
      const { data: existingRow } = await supabase
        .from("pvg_videos")
        .select(VIDEO_COLUMNS)
        .eq("project_id", project.id)
        .in("status", ["pending", "processing", "assets", "ready"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const existing = existingRow as import("./video-render.server").VideoRow | null;
      if (existing) {
        return { ok: true, video: await toVideoJob(existing), balance: await balanceOf() };
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
      const chosen =
        scenes.find((s) => s.id === project.selected_scene_id) ?? scenes[0] ?? null;
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
      const price = videoCredits(duration) + (sceneSounds ? sceneSoundCredits(duration) : 0);

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
        description: "Personal video greeting — the film",
        metadata: {
          project_id: project.id,
          seconds: duration,
          scene_sounds: sceneSounds,
        },
      });
      await supabaseAdmin
        .from("pvg_projects")
        .update({
          credits_charged: (project.credits_charged ?? 0) + price,
          status: "video_generating",
        } as never)
        .eq("id", project.id);

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
        } as never)
        .select(VIDEO_COLUMNS)
        .single();
      if (createError) throw new Error(createError.message);
      const videoRow = created as import("./video-render.server").VideoRow;

      const prompt = [
        (project.scene_description ?? "").trim(),
        `A warm, premium celebration film for ${(project.occasion ?? "").trim()}.`,
        "Gentle natural motion, the people stay exactly as they are in the picture, cinematic lighting, no text on screen.",
      ]
        .filter(Boolean)
        .join(" ");

      try {
        const { startVideoRender } = await import("./generator/video-engine.server");
        const started = await startVideoRender({
          prompt,
          imageUrl,
          durationSeconds: duration,
          sceneSounds,
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
    await supabaseAdmin
      .from("pvg_videos")
      .delete()
      .eq("project_id", p.id)
      .eq("status", "failed");
    return { cleared: true as const };
  });