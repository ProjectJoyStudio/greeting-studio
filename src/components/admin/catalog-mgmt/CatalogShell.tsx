import { type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Images,
  ImagePlus,
  Layers,
  PlusSquare,
  Tags,
  Languages as LanguagesIcon,
  FileText,
  Eye,
  EyeOff,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { useCatalogMgmt } from "@/lib/admin/catalog-mgmt/store";

interface SubNavItem {
  to: string;
  key: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}

const SUB: SubNavItem[] = [
  { to: "/admin/catalog", key: "cm_nav_overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/catalog/backgrounds", key: "cm_nav_backgrounds", icon: Images },
  { to: "/admin/catalog/backgrounds/new", key: "cm_nav_add_background", icon: ImagePlus },
  { to: "/admin/catalog/variants", key: "cm_nav_variants", icon: Layers },
  { to: "/admin/catalog/variants/new", key: "cm_nav_create_variant", icon: PlusSquare },
  { to: "/admin/catalog/taxonomy", key: "cm_nav_taxonomy", icon: Tags },
  { to: "/admin/catalog/translations", key: "cm_nav_missing", icon: LanguagesIcon },
  { to: "/admin/catalog/drafts", key: "cm_nav_drafts", icon: FileText },
  { to: "/admin/catalog/published", key: "cm_nav_published", icon: Eye },
  { to: "/admin/catalog/hidden", key: "cm_nav_hidden", icon: EyeOff },
];

export function CatalogShell({ children }: { children: ReactNode }) {
  const { t } = useCatalogMgmt();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[Fraunces] text-2xl font-semibold text-foreground">{t("cm_title")}</h1>
          <p className="text-sm text-muted-foreground">{t("cm_subtitle")}</p>
        </div>
      </header>
      <nav className="-mx-1 flex overflow-x-auto pb-1">
        <div className="flex gap-1 px-1">
          {SUB.map(({ to, key, icon: Icon, exact }) => {
            const active = exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition",
                  active
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/60 bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{t(key)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="min-w-0">{children}</div>
      <Toaster />
    </div>
  );
}