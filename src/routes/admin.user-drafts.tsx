import { createFileRoute } from "@tanstack/react-router";
import { UserDraftsPage } from "@/components/admin/user-drafts/UserDraftsPage";

export const Route = createFileRoute("/admin/user-drafts")({
  component: UserDraftsPage,
});