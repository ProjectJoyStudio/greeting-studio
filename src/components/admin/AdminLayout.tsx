import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Coins,
  ShoppingBag,
  Users,
  BookOpen,
  Package,
  Megaphone,
  Bell,
  Languages,
  CalendarDays,
  BarChart3,
  ScrollText,
  Settings,
  LogOut,
  Menu,
  Search,
  X,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { useAdminRole, ADMIN_ROLES } from "@/lib/admin/role";
import { LanguageSelector } from "@/components/site/LanguageSelector";

interface NavItem {
  to: string;
  key: string;
  icon: typeof LayoutDashboard;
}

const NAV: NavItem[] = [
  { to: "/admin", key: "admin_nav_overview", icon: LayoutDashboard },
  { to: "/admin/economy", key: "admin_nav_economy", icon: Coins },
  { to: "/admin/orders", key: "admin_nav_orders", icon: ShoppingBag },
  { to: "/admin/users", key: "admin_nav_users", icon: Users },
  { to: "/admin/catalog", key: "admin_nav_catalog", icon: BookOpen },
  { to: "/admin/credit-packages", key: "admin_nav_credit_packages", icon: Package },
  { to: "/admin/promotions", key: "admin_nav_promotions", icon: Megaphone },
  { to: "/admin/notifications", key: "admin_nav_notifications", icon: Bell },
  { to: "/admin/languages", key: "admin_nav_languages", icon: Languages },
  { to: "/admin/calendar-settings", key: "admin_nav_calendar_settings", icon: CalendarDays },
  { to: "/admin/reports", key: "admin_nav_reports", icon: BarChart3 },
  { to: "/admin/audit-log", key: "admin_nav_audit_log", icon: ScrollText },
  { to: "/admin/platform", key: "admin_nav_platform", icon: Settings },
];

export function AdminGate({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { isAdmin, setRole } = useAdminRole();
  if (isAdmin) return <>{children}</>;
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-50/60 via-background to-rose-50/40 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card/90 p-8 shadow-lg backdrop-blur">
        <h1 className="font-[Fraunces] text-2xl font-semibold text-foreground">
          {t("admin_enable_gate_title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("admin_enable_gate_body")}</p>
        <div className="mt-6 space-y-2">
          {ADMIN_ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-background px-4 py-2.5 text-sm text-foreground transition hover:border-primary/50 hover:bg-primary/5"
            >
              <span>{t(`admin_role_${r}`)}</span>
              <span className="text-xs text-muted-foreground">{t("admin_enter")} →</span>
            </button>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link to="/" className="text-xs text-muted-foreground underline-offset-2 hover:underline">
            {t("admin_return_home")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { role, setRole } = useAdminRole();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-amber-50/40 via-background to-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-border/60 bg-card/95 backdrop-blur transition-transform lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-border/60 px-5">
          <Link to="/admin" className="font-[Fraunces] text-lg font-semibold text-foreground">
            {t("admin_title")}
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-col gap-0.5 p-3 text-sm">
          {NAV.map(({ to, key, icon: Icon }) => {
            const active = to === "/admin" ? pathname === "/admin" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 transition ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{t(key)}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/60 bg-background/85 px-4 backdrop-blur lg:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden text-muted-foreground"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="relative hidden max-w-xs flex-1 sm:block">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder={t("admin_search_placeholder")}
              className="w-full rounded-md border border-border/60 bg-background py-1.5 pl-8 pr-3 text-sm outline-none focus:border-primary/60"
            />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground"
              aria-label={t("admin_notifications")}
              title={t("admin_notifications")}
            >
              <Bell className="h-5 w-5" />
            </button>
            <LanguageSelector />
            <div className="hidden text-right text-xs sm:block">
              <div className="font-medium text-foreground">{t("admin_profile")}</div>
              <div className="text-muted-foreground">{role ? t(`admin_role_${role}`) : ""}</div>
            </div>
            <button
              type="button"
              onClick={() => setRole(null)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-xs text-foreground transition hover:bg-muted/50"
            >
              <LogOut className="h-3.5 w-3.5" />
              {t("admin_logout")}
            </button>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
