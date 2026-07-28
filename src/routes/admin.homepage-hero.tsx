import { createFileRoute } from "@tanstack/react-router";

import { HeroShowcasePage } from "@/components/admin/hero-showcase/HeroShowcasePage";

export const Route = createFileRoute("/admin/homepage-hero")({
  component: HeroShowcasePage,
});