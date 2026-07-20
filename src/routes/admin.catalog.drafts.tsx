import { createFileRoute } from "@tanstack/react-router";
import { CardVariantsPage } from "@/components/admin/catalog-mgmt/CardVariantsPage";

export const Route = createFileRoute("/admin/catalog/drafts")({
  component: () => <CardVariantsPage statusFilter={["draft", "review"]} />,
});