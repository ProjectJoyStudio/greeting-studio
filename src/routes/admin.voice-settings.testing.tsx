import { createFileRoute } from "@tanstack/react-router";

import { ModelTestingPage } from "@/components/admin/voice-settings/ModelTestingPage";

export const Route = createFileRoute("/admin/voice-settings/testing")({
  validateSearch: (search: Record<string, unknown>): { model?: string } => ({
    model: typeof search['model'] === "string" ? (search['model'] as string) : undefined,
  }),
  component: ModelTestingPage,
});