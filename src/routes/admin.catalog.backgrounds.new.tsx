import { createFileRoute } from "@tanstack/react-router";
import { AddBackgroundPage } from "@/components/admin/catalog-mgmt/AddBackgroundPage";

export const Route = createFileRoute("/admin/catalog/backgrounds/new")({
  component: () => <AddBackgroundPage />,
});