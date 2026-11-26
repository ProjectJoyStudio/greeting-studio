import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduled clean-up: permanently removes user postcards whose retention
 * period has expired. Records are finalized only after their files are
 * verified gone (see src/lib/cleanup).
 */
export const Route = createFileRoute("/api/public/purge-deleted-cards")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifySchedulerRequest } = await import("@/lib/scheduler/auth.server");
        if (!(await verifySchedulerRequest(request, "card_purge_dispatch_config"))) {
          return new Response("Unauthorized", { status: 401 });
        }
        // Verified cleanup: every file is checked absent before its item is
        // finalized, with a durable per-file history and bounded retries.
        const { runVerifiedCleanup } = await import("@/lib/cleanup/cleanup.server");
        const r = await runVerifiedCleanup();
        return Response.json({
          purged: r.completed.card,
          purgedLiveCards: r.completed.live_card,
          purgedLiveGreetings: r.completed.live_animation,
          purgedVideoDrafts: r.completed.pvg_project,
          retrying: r.retrying,
          failed: r.failed,
          notVerified: r.notVerified,
          cancelled: r.cancelled,
        });
      },
    },
  },
});