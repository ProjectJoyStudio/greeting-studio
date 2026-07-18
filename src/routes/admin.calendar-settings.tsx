import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/admin/Placeholder";

export const Route = createFileRoute("/admin/calendar-settings")({
  component: () => <AdminPlaceholder titleKey="admin_nav_calendar_settings" />,
});
