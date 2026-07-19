import { createFileRoute } from "@tanstack/react-router";
import { PlatformSettingsPage } from "@/components/admin/platform-settings/PlatformSettingsPage";

export const Route = createFileRoute("/admin/platform-settings")({
  component: PlatformSettingsPage,
});