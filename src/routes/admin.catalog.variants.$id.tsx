import { createFileRoute } from "@tanstack/react-router";
import { CreateCardVariantPage } from "@/components/admin/catalog-mgmt/CreateCardVariantPage";

export const Route = createFileRoute("/admin/catalog/variants/$id")({
  component: EditVariant,
});

function EditVariant() {
  const { id } = Route.useParams();
  return <CreateCardVariantPage editId={id} />;
}