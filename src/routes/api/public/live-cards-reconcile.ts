// Scheduled background job: finishes live greeting card animations whose
// creators have already left the page, so nothing depends on an open browser.
// Authorised only by the service-only scheduler secret (live_cards_dispatch_config).
import { createFileRoute } from "@tanstack/react-router";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const Route = createFileRoute("/api/public/live-cards-reconcile")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifySchedulerRequest } = await import("@/lib/scheduler/auth.server");
        if (!(await verifySchedulerRequest(request, "live_cards_dispatch_config")))
          return json({ error: "unauthorized" }, 401);
        const { reconcilePendingAnimations } = await import("@/lib/live-cards/reconcile.server");
        const result = await reconcilePendingAnimations(40);
        return json({ ok: true, ...result });
      },
    },
  },
});
