import { createFileRoute } from "@tanstack/react-router";
import { CalendarSettingsPage } from "@/components/admin/calendar-settings/CalendarSettingsPage";

export const Route = createFileRoute("/admin/calendar-settings")({
  component: CalendarSettingsPage,
});
