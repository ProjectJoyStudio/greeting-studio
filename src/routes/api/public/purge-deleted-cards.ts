import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduled clean-up: permanently removes user postcards whose retention
 * period has expired (records, projects and stored files).
 */
export const Route = createFileRoute("/api/public/purge-deleted-cards")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
        const provided = request.headers.get("apikey") ?? "";
        if (!expected || provided !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { purgeExpiredCards, purgeExpiredLiveCards, purgeExpiredLiveAnimations } = await import(
          "@/lib/admin/deleted-cards.server"
        );
        const cards = await purgeExpiredCards();
        const liveCards = await purgeExpiredLiveCards();
        const liveGreetings = await purgeExpiredLiveAnimations();
        return Response.json({
          purged: cards.purged,
          purgedLiveCards: liveCards.purged,
          purgedLiveGreetings: liveGreetings.purged,
        });
      },
    },
  },
});