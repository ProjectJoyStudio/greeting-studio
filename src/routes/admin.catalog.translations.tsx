import { createFileRoute } from "@tanstack/react-router";
import { MissingTranslationsPage } from "@/components/admin/catalog-mgmt/MissingTranslationsPage";

export const Route = createFileRoute("/admin/catalog/translations")({
  component: MissingTranslationsPage,
});