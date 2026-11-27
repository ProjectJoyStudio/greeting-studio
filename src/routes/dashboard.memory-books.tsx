import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/memory-books")({
  component: MemoryBooksLayout,
});

function MemoryBooksLayout() {
  return <Outlet />;
}
