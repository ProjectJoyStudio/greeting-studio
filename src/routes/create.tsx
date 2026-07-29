import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy entry point: greeting-card creation lives on one universal page. */
export const Route = createFileRoute("/create")({
  beforeLoad: () => {
    throw redirect({ to: "/create-card" });
  },
});
