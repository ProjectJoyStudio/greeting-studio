import { createFileRoute } from "@tanstack/react-router";

import { DevCreditsPage } from "@/components/admin/dev-credits/DevCreditsPage";

export const Route = createFileRoute("/admin/dev-credits")({
  component: DevCreditsPage,
});
