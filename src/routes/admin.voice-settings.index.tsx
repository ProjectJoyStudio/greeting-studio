import { createFileRoute } from "@tanstack/react-router";

import { VoiceSettingsPage } from "@/components/admin/voice-settings/VoiceSettingsPage";

export const Route = createFileRoute("/admin/voice-settings/")({
  component: VoiceSettingsPage,
});