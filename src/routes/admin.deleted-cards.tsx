import { createFileRoute } from "@tanstack/react-router";
import { DeletedCardsPage } from "@/components/admin/deleted-cards/DeletedCardsPage";

export const Route = createFileRoute("/admin/deleted-cards")({
  component: DeletedCardsPage,
});