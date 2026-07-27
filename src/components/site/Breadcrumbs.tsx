import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export type Crumb = { label: string; to?: string; params?: Record<string, string> };

/** Localized breadcrumb trail; the last item is the current page and is inert. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="breadcrumb" className="text-xs text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {last || !item.to ? (
                <span aria-current={last ? "page" : undefined} className="text-foreground/80">
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.to}
                  params={item.params as never}
                  className="transition hover:text-foreground"
                >
                  {item.label}
                </Link>
              )}
              {!last && <ChevronRight className="h-3 w-3 opacity-60" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}