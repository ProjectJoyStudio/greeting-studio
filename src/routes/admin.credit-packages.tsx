import { createFileRoute } from "@tanstack/react-router";
import { CreditPackagesPage } from "@/components/admin/credit-packages/CreditPackagesPage";

export const Route = createFileRoute("/admin/credit-packages")({
  component: CreditPackagesPage,
});