import { createFileRoute } from "@tanstack/react-router";
import { AddBackgroundPage } from "@/components/admin/catalog-mgmt/AddBackgroundPage";

export const Route = createFileRoute("/admin/catalog/backgrounds/$id")({
  component: EditBackground,
});

function EditBackground() {
  const { id } = Route.useParams();
  return <AddBackgroundPage editId={id} />;
}