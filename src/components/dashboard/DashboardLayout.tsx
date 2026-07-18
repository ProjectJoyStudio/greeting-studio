import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  UserRound,
  Settings,
  Bell,
  Coins,
  Package,
  Heart,
} from "lucide-react";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useI18n } from "@/lib/i18n";

const items = [
  { to: "/dashboard", key: "nav_dashboard", icon: LayoutDashboard },
  { to: "/dashboard/profile", key: "nav_profile", icon: UserRound },
  { to: "/dashboard/settings", key: "nav_settings", icon: Settings },
  { to: "/dashboard/notifications", key: "nav_notifications", icon: Bell },
  { to: "/dashboard/credits", key: "nav_credits", icon: Coins },
  { to: "/dashboard/orders", key: "nav_orders", icon: Package },
  { to: "/dashboard/favorites", key: "nav_favorites", icon: Heart },
] as const;

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-5 py-8 lg:flex-row lg:px-8">
        <aside className="w-full shrink-0 lg:w-60">
          <nav className="rounded-2xl border border-border/60 bg-card/70 p-2 backdrop-blur">
            <ul className="flex flex-row gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
              {items.map(({ to, key, icon: Icon }) => (
                <li key={to} className="shrink-0 lg:shrink">
                  <Link
                    to={to}
                    activeOptions={{ exact: to === "/dashboard" }}
                    className="flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-foreground"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{t(key)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <main className="flex-1">{children}</main>
      </div>
      <Footer />
    </div>
  );
}

export function DashboardPageHeader({
  titleKey,
  subtitleKey,
}: {
  titleKey: string;
  subtitleKey: string;
}) {
  const { t } = useI18n();
  return (
    <header className="mb-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
        {t(titleKey)}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{t(subtitleKey)}</p>
    </header>
  );
}

export function ComingSoonCard({ children }: { children?: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-card/50 p-8 text-center">
      <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {t("soon")}
      </span>
      <p className="mt-3 text-sm text-muted-foreground">
        {children ?? t("placeholder_soon")}
      </p>
    </div>
  );
}