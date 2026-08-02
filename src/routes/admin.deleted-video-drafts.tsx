import { createFileRoute } from "@tanstack/react-router";

import { DeletedVideoDraftsPage } from "@/components/admin/deleted-video-drafts/DeletedVideoDraftsPage";

export const Route = createFileRoute("/admin/deleted-video-drafts")({
  component: DeletedVideoDraftsPage,
});
