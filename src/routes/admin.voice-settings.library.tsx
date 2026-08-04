import { createFileRoute } from "@tanstack/react-router";

import { VoiceLibraryPage } from "@/components/admin/voice-settings/VoiceLibraryPage";

export const Route = createFileRoute("/admin/voice-settings/library")({
  component: VoiceLibraryPage,
});