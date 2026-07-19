import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPage } from "@/components/admin/notifications/NotificationsPage";

export const Route = createFileRoute("/admin/notifications")({
  component: NotificationsPage,
});
