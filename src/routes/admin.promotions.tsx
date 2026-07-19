import { createFileRoute } from "@tanstack/react-router";
import { PromotionsPage } from "@/components/admin/promotions/PromotionsPage";

export const Route = createFileRoute("/admin/promotions")({
  component: PromotionsPage,
});
