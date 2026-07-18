import { Outlet, createFileRoute } from "@tanstack/react-router";
import { AdminGate, AdminLayout } from "@/components/admin/AdminLayout";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Project Joy — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminShell,
});

function AdminShell() {
  return (
    <AdminGate>
      <AdminLayout>
        <Outlet />
      </AdminLayout>
    </AdminGate>
  );
}
