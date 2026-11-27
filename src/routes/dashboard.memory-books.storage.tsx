import { createFileRoute } from "@tanstack/react-router";
import { MemoryBookCollectionPage } from "@/components/memory-book/MemoryBookCollectionPage";

export const Route = createFileRoute("/dashboard/memory-books/storage")({
  head: () => ({ meta: [
    { title: "My Storage — Project Joy Memory Books" },
    { name: "description", content: "Your Memory Books with confirmed purchased online storage and paid storage deadlines." },
    { property: "og:title", content: "My Storage — Project Joy Memory Books" },
    { property: "og:description", content: "Your Memory Books with confirmed purchased online storage and paid storage deadlines." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: StorageBooksPage,
});
function StorageBooksPage() {
  return <MemoryBookCollectionPage collection="storage" />;
}
