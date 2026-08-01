import { createFileRoute } from "@tanstack/react-router";

import { StudioPromosPage } from "@/components/admin/studio-promos/StudioPromosPage";

export const Route = createFileRoute("/admin/studio-promos")({
  component: StudioPromosPage,
});