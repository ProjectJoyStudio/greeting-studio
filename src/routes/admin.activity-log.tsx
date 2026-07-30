import { createFileRoute } from "@tanstack/react-router";
import { ActivityLogPage } from "@/components/admin/activity-log/ActivityLogPage";

export const Route = createFileRoute("/admin/activity-log")({
  component: ActivityLogPage,
});