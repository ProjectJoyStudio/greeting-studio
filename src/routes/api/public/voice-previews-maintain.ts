import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduled voice care: checks every stored voice sample of every Project Joy
 * language and prepares again anything that is missing or damaged. This keeps
 * "Preview" working for every voice, and new languages receive their samples
 * automatically without anybody having to ask for them.
 */
export const Route = createFileRoute("/api/public/voice-previews-maintain")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
        const provided = request.headers.get("apikey") ?? "";
        if (!expected || provided !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { verifyPreviews } = await import("@/lib/voice-library/library.server");
        return Response.json(await verifyPreviews());
      },
    },
  },
});
