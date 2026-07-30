import { createFileRoute } from "@tanstack/react-router";
import { DeletedLiveCardsPage } from "@/components/admin/deleted-live-cards/DeletedLiveCardsPage";

export const Route = createFileRoute("/admin/deleted-live-cards")({
  component: DeletedLiveCardsPage,
});
