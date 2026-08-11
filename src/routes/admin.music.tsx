import { createFileRoute } from "@tanstack/react-router";

import { MusicPage } from "@/components/admin/music/MusicPage";

export const Route = createFileRoute("/admin/music")({
  head: () => ({
    meta: [
      { title: "Music library — Project Joy Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MusicPage,
});