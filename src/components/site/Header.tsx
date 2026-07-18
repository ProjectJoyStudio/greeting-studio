import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X, Sparkles, UserRound } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LanguageSelector } from "./LanguageSelector";
import { useAuth } from "@/lib/auth/AuthContext";

const navItems = [
  { to: "/", key: "nav_home" },
  { to: "/studio", key: "nav_studio" },
  { to: "/catalog", key: "nav_catalog" },
  { to: "/daily", key: "nav_daily" },
  { to: "/create", key: "nav_create" },
  { to: "/personal-orders", key: "nav_personal" },
  { to: "/calendar", key: "nav_calendar" },
  { to: "/pricing", key: "nav_pricing" },
  { to: "/corporate-orders", key: "nav_corporate" },
  { to: "/about", key: "nav_about" },
  { to: "/contact", key: "nav_contact" },
] as const;

export function Header() {
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-4 lg:px-8">
        <Link
          to="/"
          className="flex items-center gap-2"
          onClick={() => setOpen(false)}
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gold-gradient shadow-warm">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </span>
          <span className="font-display text-xl font-semibold tracking-tight">
            {t("brand")}
          </span>
        </Link>

        <nav className="ml-6 hidden flex-1 flex-wrap items-center gap-x-1 gap-y-1 xl:flex-nowrap lg:flex">
          {navItems.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="rounded-full px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground transition hover:bg-secondary hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-foreground"
            >
              {t(n.key)}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <LanguageSelector />
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="hidden items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1.5 text-sm text-foreground/80 transition hover:text-foreground md:inline-flex"
            >
              <UserRound className="h-4 w-4 text-primary/70" />
              <span>{t("nav_dashboard")}</span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="hidden rounded-full border border-border/70 bg-card/70 px-3 py-1.5 text-sm text-foreground/80 transition hover:text-foreground md:inline-flex"
            >
              {t("auth_signin")}
            </Link>
          )}
          <Link
            to="/create"
            className="hidden rounded-full bg-gold-gradient px-4 py-2 text-sm font-medium text-primary-foreground shadow-warm transition hover:opacity-95 md:inline-flex"
          >
            {t("cta_create")}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-full border border-border/70 lg:hidden"
            aria-label="Menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background/95 lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
            {navItems.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                activeOptions={{ exact: n.to === "/" }}
                className="rounded-lg px-3 py-2 text-sm text-foreground/80 transition hover:bg-secondary data-[status=active]:bg-secondary data-[status=active]:text-foreground"
              >
                {t(n.key)}
              </Link>
            ))}
            <Link
              to="/create"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex justify-center rounded-full bg-gold-gradient px-4 py-2 text-sm font-medium text-primary-foreground shadow-warm"
            >
              {t("cta_create")}
            </Link>
            <Link
              to={isAuthenticated ? "/dashboard" : "/login"}
              onClick={() => setOpen(false)}
              className="inline-flex justify-center rounded-full border border-border/70 bg-background px-4 py-2 text-sm font-medium text-foreground"
            >
              {isAuthenticated ? t("nav_dashboard") : t("auth_signin")}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}