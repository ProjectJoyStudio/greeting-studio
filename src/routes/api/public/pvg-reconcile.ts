// Scheduled background job: finishes starting scenes of personal video
// greetings whose creators have already left the page.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/pvg-reconcile")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = request.headers.get("apikey") ?? "";
        const expected =
          process.env["SUPABASE_ANON_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";
        if (!expected || key !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        const { reconcilePendingScenes } = await import("@/lib/personal-video/pvg.server");
        const result = await reconcilePendingScenes(40);
        return new Response(JSON.stringify({ ok: true, ...result }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});