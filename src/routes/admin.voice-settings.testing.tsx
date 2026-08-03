import { createFileRoute } from "@tanstack/react-router";

import { ModelTestingPage } from "@/components/admin/voice-settings/ModelTestingPage";

export const Route = createFileRoute("/admin/voice-settings/testing")({
  component: ModelTestingPage,
});