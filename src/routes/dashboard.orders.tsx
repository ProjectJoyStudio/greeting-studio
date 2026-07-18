import { createFileRoute } from "@tanstack/react-router";

import { ComingSoonCard, DashboardPageHeader } from "@/components/dashboard/DashboardLayout";

export const Route = createFileRoute("/dashboard/orders")({
  component: OrdersPage,
});

function OrdersPage() {
  return (
    <div>
      <DashboardPageHeader titleKey="orders_title" subtitleKey="orders_sub" />
      <ComingSoonCard />
    </div>
  );
}