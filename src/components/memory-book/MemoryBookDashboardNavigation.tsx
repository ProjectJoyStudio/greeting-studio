import { Link } from "@tanstack/react-router";
import { BookOpen, Library, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

const sections = [
  { to: "/dashboard/memory-books/working", label: "mbd_in_progress", Icon: Pencil },
  { to: "/dashboard/memory-books/completed", label: "mbd_finished", Icon: BookOpen },
  { to: "/dashboard/memory-books/storage", label: "mbd_storage", Icon: Library },
] as const;

export function MemoryBookDashboardNavigation() {
  const { t } = useI18n();
  return (
    <nav aria-label={t("mbd_title")} className="mb-6 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3">
      {sections.map(({ to, label, Icon }) => (
        <Button key={to} asChild variant="outline" className="h-auto min-h-11 min-w-0 justify-start whitespace-normal px-4 py-3 data-[status=active]:border-primary data-[status=active]:bg-primary/10 data-[status=active]:text-primary">
          <Link to={to} activeOptions={{ exact: true }} activeProps={{ "aria-current": "page" }}>
            <Icon className="mr-2 h-4 w-4 shrink-0" aria-hidden />
            <span>{t(label)}</span>
          </Link>
        </Button>
      ))}
    </nav>
  );
}
