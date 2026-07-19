import { createFileRoute } from "@tanstack/react-router";
import { CatalogPage } from "@/components/admin/catalog/CatalogPage";

export const Route = createFileRoute("/admin/catalog")({
  component: CatalogPage,
});
