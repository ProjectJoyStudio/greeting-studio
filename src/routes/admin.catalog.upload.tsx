import { createFileRoute } from "@tanstack/react-router";
import { UploadCardsPage } from "@/components/admin/catalog-mgmt/UploadCardsPage";

export const Route = createFileRoute("/admin/catalog/upload")({
  component: UploadCardsPage,
});