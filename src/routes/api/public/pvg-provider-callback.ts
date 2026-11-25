// Signed Replicate webhook for Personal Video Greeting final films.
//
// Verification follows Replicate's documented webhook signing (Standard
// Webhooks): HMAC-SHA256 over "<webhook-id>.<webhook-timestamp>.<raw body>"
// with the account's signing secret from GET /v1/webhooks/default/secret.
// The payload is never trusted for status, money or ownership: it only names a
// prediction, which is matched to a stored paid operation and then re-read
// from the provider with our own token by the ordinary reconcile path.
import { createFileRoute } from "@tanstack/react-router";

import { verifyReplicateSignature } from "@/lib/personal-video/webhook-signature";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const Route = createFileRoute("/api/public/pvg-provider-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.text();
        if (body.length > 1_000_000) return json({ error: "too_large" }, 413);
        const deliveryId = request.headers.get("webhook-id") ?? "";
        const timestamp = request.headers.get("webhook-timestamp") ?? "";
        const signature = request.headers.get("webhook-signature") ?? "";
        const { replicateWebhookSecret } = await import(
          "@/lib/personal-video/generator/pipeline.server"
        );
        const secret = await replicateWebhookSecret();
        if (!secret) return json({ error: "unavailable" }, 503); // provider retries later
        if (!(await verifyReplicateSignature(secret, deliveryId, timestamp, body, signature)))
          return json({ error: "unauthorized" }, 401);

        let payload: { id?: string; status?: string; model?: string };
        try {
          payload = JSON.parse(body) as typeof payload;
        } catch {
          return json({ error: "invalid" }, 400);
        }
        const op = new URL(request.url).searchParams.get("op") ?? "";
        const predictionId = String(payload.id ?? "");
        if (!/^[0-9a-f-]{36}$/i.test(op) || !predictionId) return json({ error: "invalid" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const record = async (outcome: string) => {
          await supabaseAdmin.from("pvg_provider_callbacks").insert({
            delivery_id: `replicate:${deliveryId}`,
            provider: "replicate",
            video_id: op,
            prediction_id: predictionId,
            event: String(payload.status ?? ""),
            outcome,
          });
        };
        const { data: seen } = await supabaseAdmin
          .from("pvg_provider_callbacks")
          .select("delivery_id")
          .eq("delivery_id", `replicate:${deliveryId}`)
          .maybeSingle();
        if (seen) return json({ ok: true, duplicate: true });

        const { data: row } = await supabaseAdmin
          .from("pvg_videos")
          .select(
            "id, status, payment_key, video_prediction_id, prediction_id, video_generator_key, dispatch_fingerprint, submission_state, callback_count",
          )
          .eq("id", op)
          .maybeSingle();
        const video = row as {
          id: string;
          status: string;
          payment_key: string | null;
          video_prediction_id: string | null;
          prediction_id: string | null;
          video_generator_key: string | null;
          dispatch_fingerprint: string | null;
          submission_state: string | null;
          callback_count: number;
        } | null;
        if (!video?.payment_key) {
          await record("rejected_unknown_operation");
          return json({ error: "unknown_operation" }, 404);
        }
        const stored = video.video_prediction_id ?? video.prediction_id;
        if (stored && stored !== predictionId) {
          await record("rejected_prediction_mismatch");
          return json({ error: "mismatch" }, 409);
        }
        if (!stored) {
          // The submission response was lost. Adopt the prediction only after
          // reading it ourselves and matching the exact submitted input.
          const { readReplicatePrediction, dispatchFingerprint, engineModel } = await import(
            "@/lib/personal-video/generator/pipeline.server"
          );
          const model = engineModel(video.video_generator_key);
          const actual = await readReplicatePrediction(predictionId);
          const matches =
            model &&
            actual &&
            actual.model === model &&
            video.dispatch_fingerprint &&
            (await dispatchFingerprint(
              model,
              String(actual.input["image"] ?? ""),
              String(actual.input["audio"] ?? ""),
            )) === video.dispatch_fingerprint;
          if (!matches || !["dispatching", "uncertain"].includes(video.submission_state ?? "")) {
            await record("rejected_unverified_adoption");
            return json({ error: "unverified" }, 409);
          }
          await supabaseAdmin
            .from("pvg_videos")
            .update({
              video_prediction_id: predictionId,
              prediction_id: predictionId,
              submission_state: "accepted",
              status: "processing",
            } as never)
            .eq("id", video.id)
            .eq("status", "pending")
            .is("video_prediction_id", null);
        }
        await supabaseAdmin
          .from("pvg_videos")
          .update({
            callback_count: (video.callback_count ?? 0) + 1,
            last_callback_at: new Date().toISOString(),
            next_reconcile_at: new Date().toISOString(),
          } as never)
          .eq("id", video.id);
        await record(stored ? "accepted" : "adopted");
        // Status always comes from our own provider read, under the reconcile lease.
        const { reconcileVideo } = await import("@/lib/personal-video/video-render.server");
        const status = await reconcileVideo(video.id);
        return json({ ok: true, status });
      },
    },
  },
});
