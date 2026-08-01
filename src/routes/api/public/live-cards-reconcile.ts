// Scheduled background job: finishes live greeting card animations whose
// creators have already left the page, so nothing depends on an open browser.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/live-cards-reconcile")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = request.headers.get("apikey") ?? "";
        const expected = process.env["SUPABASE_ANON_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";
        if (!expected || key !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        const { reconcilePendingAnimations } = await import("@/lib/live-cards/reconcile.server");
        const result = await reconcilePendingAnimations(40);
        return new Response(JSON.stringify({ ok: true, ...result }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
