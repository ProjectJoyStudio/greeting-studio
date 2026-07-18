import { createFileRoute } from "@tanstack/react-router";
import { AdminPlaceholder } from "@/components/admin/Placeholder";

export const Route = createFileRoute("/admin/users")({
  component: () => <AdminPlaceholder titleKey="admin_nav_users" />,
});
