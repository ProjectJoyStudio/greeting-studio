import { Outlet, createFileRoute } from "@tanstack/react-router";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Project Joy" },
      { name: "description", content: "Your Project Joy account dashboard." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardShell,
});

function DashboardShell() {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
}