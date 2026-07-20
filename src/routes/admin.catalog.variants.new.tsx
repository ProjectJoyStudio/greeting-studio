import { createFileRoute } from "@tanstack/react-router";
import { CreateCardVariantPage } from "@/components/admin/catalog-mgmt/CreateCardVariantPage";

interface VariantNewSearch {
  backgroundId?: string;
}

export const Route = createFileRoute("/admin/catalog/variants/new")({
  validateSearch: (search: Record<string, unknown>): VariantNewSearch => ({
    backgroundId: typeof search.backgroundId === "string" ? search.backgroundId : undefined,
  }),
  component: NewVariant,
});

function NewVariant() {
  const { backgroundId } = Route.useSearch();
  return <CreateCardVariantPage initialBackgroundId={backgroundId} />;
}