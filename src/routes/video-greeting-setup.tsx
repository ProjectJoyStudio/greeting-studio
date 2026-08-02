import { createFileRoute } from "@tanstack/react-router";

import { VideoSetupPage } from "@/components/personal-video/VideoSetupPage";

export const Route = createFileRoute("/video-greeting-setup")({
  validateSearch: (search: Record<string, unknown>): { project?: string } =>
    typeof search.project === "string" ? { project: search.project } : {},
  head: () => ({
    meta: [
      { title: "Prepare your video greeting — Project Joy" },
      {
        name: "description",
        content:
          "Choose the length, write or create the greeting and see the live cost of your personal video greeting before it is made.",
      },
      { property: "og:title", content: "Prepare your video greeting — Project Joy" },
      {
        property: "og:description",
        content: "Length, greeting, voice and music of your personal video greeting in one calm workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VideoSetupRoute,
});

function VideoSetupRoute() {
  const { project } = Route.useSearch();
  return <VideoSetupPage projectId={project} />;
}
