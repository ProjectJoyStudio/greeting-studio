import { createFileRoute } from "@tanstack/react-router";
import { OrdersPage } from "@/components/admin/orders/OrdersPage";

export const Route = createFileRoute("/admin/orders")({
  component: OrdersPage,
});
