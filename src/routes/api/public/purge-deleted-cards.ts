import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduled clean-up: permanently removes user postcards whose retention
 * period has expired (records, projects and stored files).
 */
export const Route = createFileRoute("/api/public/purge-deleted-cards")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifySchedulerRequest } = await import("@/lib/scheduler/auth.server");
        if (!(await verifySchedulerRequest(request, "card_purge_dispatch_config"))) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { purgeExpiredCards, purgeExpiredLiveCards, purgeExpiredLiveAnimations } = await import(
          "@/lib/admin/deleted-cards.server"
        );
        const cards = await purgeExpiredCards();
        const liveCards = await purgeExpiredLiveCards();
        const liveGreetings = await purgeExpiredLiveAnimations();
        const { purgeExpiredPvgProjects } = await import("@/lib/personal-video/order.server");
        const videoDrafts = await purgeExpiredPvgProjects();
        return Response.json({
          purged: cards.purged,
          purgedLiveCards: liveCards.purged,
          purgedLiveGreetings: liveGreetings.purged,
          purgedVideoDrafts: videoDrafts.purged,
        });
      },
    },
  },
});