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
        const { verifySchedulerRequest } = await import("@/lib/scheduler/auth.server");
        if (!(await verifySchedulerRequest(request, "pvg_dispatch_config")))
          return json({ error: "unauthorized" }, 401);
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
