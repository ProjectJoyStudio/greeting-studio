import { createFileRoute } from "@tanstack/react-router";

import { YourCreditsPage } from "@/components/admin/your-credits/YourCreditsPage";

export const Route = createFileRoute("/admin/your-credits")({
  component: YourCreditsPage,
});
