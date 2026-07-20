import { createFileRoute } from "@tanstack/react-router";
import { BackgroundLibraryPage } from "@/components/admin/catalog-mgmt/BackgroundLibraryPage";

export const Route = createFileRoute("/admin/catalog/backgrounds")({
  component: BackgroundLibraryPage,
});

// This is a leaf route; sub-routes /new and /$id are declared in sibling files.