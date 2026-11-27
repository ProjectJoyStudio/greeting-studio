import { createFileRoute } from "@tanstack/react-router";
import { MemoryBookCollectionPage } from "@/components/memory-book/MemoryBookCollectionPage";

export const Route = createFileRoute("/dashboard/memory-books/working")({
  head: () => ({ meta: [
    { title: "Books in Progress — Project Joy Memory Books" },
    { name: "description", content: "Continue editing your unfinished Memory Books and manage your existing working time." },
    { property: "og:title", content: "Books in Progress — Project Joy Memory Books" },
    { property: "og:description", content: "Continue editing your unfinished Memory Books and manage your existing working time." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: WorkingBooksPage,
});
function WorkingBooksPage() {
  return <MemoryBookCollectionPage collection="working" />;
}
