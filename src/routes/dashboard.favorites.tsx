import { createFileRoute } from "@tanstack/react-router";

import { ComingSoonCard, DashboardPageHeader } from "@/components/dashboard/DashboardLayout";

export const Route = createFileRoute("/dashboard/favorites")({
  component: FavoritesPage,
});

function FavoritesPage() {
  return (
    <div>
      <DashboardPageHeader titleKey="favorites_title" subtitleKey="favorites_sub" />
      <ComingSoonCard />
    </div>
  );
}