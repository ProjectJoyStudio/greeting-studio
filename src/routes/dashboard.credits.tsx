import { createFileRoute } from "@tanstack/react-router";

import { ComingSoonCard, DashboardPageHeader } from "@/components/dashboard/DashboardLayout";

export const Route = createFileRoute("/dashboard/credits")({
  component: CreditsPage,
});

function CreditsPage() {
  return (
    <div>
      <DashboardPageHeader titleKey="credits_title" subtitleKey="credits_sub" />
      <ComingSoonCard />
    </div>
  );
}