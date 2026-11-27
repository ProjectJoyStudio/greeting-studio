import { createFileRoute } from "@tanstack/react-router";
import { MemoryBookCollectionPage } from "@/components/memory-book/MemoryBookCollectionPage";

export const Route = createFileRoute("/dashboard/memory-books/completed")({
  head: () => ({ meta: [
    { title: "Completed Books — Project Joy Memory Books" },
    { name: "description", content: "Open, download and share completed Memory Books without a confirmed long-term storage purchase." },
    { property: "og:title", content: "Completed Books — Project Joy Memory Books" },
    { property: "og:description", content: "Open, download and share completed Memory Books without a confirmed long-term storage purchase." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: CompletedBooksPage,
});
function CompletedBooksPage() {
  return <MemoryBookCollectionPage collection="completed" />;
}
