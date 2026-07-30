import { createFileRoute } from "@tanstack/react-router";
import { UserLiveCardsPage } from "@/components/admin/user-live-cards/UserLiveCardsPage";

export const Route = createFileRoute("/admin/user-live-cards")({
  component: UserLiveCardsPage,
});
