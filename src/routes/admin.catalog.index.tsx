import { createFileRoute } from "@tanstack/react-router";
import { OverviewPage } from "@/components/admin/catalog-mgmt/OverviewPage";

export const Route = createFileRoute("/admin/catalog/")({
  component: OverviewPage,
});