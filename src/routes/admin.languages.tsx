import { createFileRoute } from "@tanstack/react-router";
import { LanguagesPage } from "@/components/admin/languages/LanguagesPage";

export const Route = createFileRoute("/admin/languages")({
  component: LanguagesPage,
});
