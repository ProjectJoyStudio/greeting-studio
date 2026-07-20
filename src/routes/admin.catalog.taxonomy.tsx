import { createFileRoute } from "@tanstack/react-router";
import { TaxonomyPage } from "@/components/admin/catalog-mgmt/TaxonomyPage";

export const Route = createFileRoute("/admin/catalog/taxonomy")({
  component: TaxonomyPage,
});