// Scheduled background job: finishes starting scenes and final films of
// personal video greetings whose creators have already left the page.
// Authorised by a service-only scheduler credential (pvg_dispatch_config),
// never by the public browser key.
import { createFileRoute } from "@tanstack/react-router";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const Route = createFileRoute("/api/public/pvg-reconcile")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const header = request.headers.get("authorization") ?? "";
        if (!header.startsWith("Bearer ") || header.length > 200)
          return json({ error: "unauthorized" }, 401);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: config } = await supabaseAdmin
          .from("pvg_dispatch_config")
          .select("secret, enabled")
          .eq("id", true)
          .maybeSingle();
        const expected = new TextEncoder().encode(config?.secret ?? "");
        const supplied = new TextEncoder().encode(header.slice(7));
        let diff = expected.length === supplied.length && expected.length > 0 ? 0 : 1;
        for (let i = 0; i < Math.min(expected.length, supplied.length); i++)
          diff |= expected[i]! ^ supplied[i]!;
        if (!config?.enabled || diff !== 0) return json({ error: "unauthorized" }, 401);
        const { reconcilePendingScenes } = await import("@/lib/personal-video/pvg.server");
        const { reconcilePendingVideos } = await import(
          "@/lib/personal-video/video-render.server"
        );
        const result = await reconcilePendingScenes(40);
        const videos = await reconcilePendingVideos(20);
        return json({ ok: true, ...result, ...videos });
      },
    },
  },
});
