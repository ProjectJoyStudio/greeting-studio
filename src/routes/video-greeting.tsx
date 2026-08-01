import { createFileRoute } from "@tanstack/react-router";

import { PersonalVideoPage } from "@/components/personal-video/PersonalVideoPage";

export const Route = createFileRoute("/video-greeting")({
  validateSearch: (search: Record<string, unknown>): { project?: string } =>
    typeof search.project === "string" ? { project: search.project } : {},
  head: () => ({
    meta: [
      { title: "Personal video greeting — Project Joy" },
      {
        name: "description",
        content:
          "Create the starting scene of your personal video greeting: describe the moment, add the people you love and choose the picture that opens the film.",
      },
      { property: "og:title", content: "Personal video greeting — Project Joy" },
      {
        property: "og:description",
        content: "Describe the opening moment, add up to five people and choose your favourite starting scene.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VideoGreetingRoute,
});

function VideoGreetingRoute() {
  const { project } = Route.useSearch();
  return <PersonalVideoPage projectId={project} />;
}