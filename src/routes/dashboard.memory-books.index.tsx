import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { MemoryBookDashboardNavigation } from "@/components/memory-book/MemoryBookDashboardNavigation";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/dashboard/memory-books/")({
  head: () => ({ meta: [
    { title: "My Memory Books — Project Joy" },
    { name: "description", content: "Your books in progress, completed books and purchased online storage in Project Joy." },
    { property: "og:title", content: "My Memory Books — Project Joy" },
    { property: "og:description", content: "Manage your personal Memory Books and their storage." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: MemoryBooksEntry,
});
function MemoryBooksEntry() {
  const { t } = useI18n();
  return <>
    <DashboardPageHeader titleKey="mbd_title" subtitleKey="mbd_sub" />
    <MemoryBookDashboardNavigation />
    <Button asChild><Link to="/memory-book-packages"><Plus className="mr-2 h-4 w-4" />{t("mbd_create_another")}</Link></Button>
  </>;
}
