import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X, Sparkles, UserRound, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LanguageSelector } from "./LanguageSelector";
import { useAuth } from "@/lib/auth/AuthContext";

// -----------------------------------------------------------------------------
// Compact desktop header with dropdowns. Fits at laptop widths (>=1024px) by
// grouping related routes into three menus. Under lg, everything collapses
// into a single hamburger sheet.
// -----------------------------------------------------------------------------

type NavLeaf = { to: string; key: string };

const OCCASIONS_MENU: NavLeaf[] = [
  { to: "/daily", key: "nav_daily" },
  { to: "/calendar", key: "nav_calendar" },
  { to: "/catalog", key: "nav_popular" },
  { to: "/catalog", key: "nav_new" },
];

const STUDIO_MENU: NavLeaf[] = [
  { to: "/studio", key: "gift_card" },
  { to: "/studio", key: "gift_animated" },
  { to: "/studio", key: "gift_song" },
  { to: "/studio", key: "gift_video_greeting" },
  { to: "/studio", key: "gift_video_clip" },
  { to: "/studio", key: "gift_fairy_tale" },
  { to: "/studio", key: "gift_cartoon" },
  { to: "/studio", key: "gift_premium" },
];

const BUSINESS_MENU: NavLeaf[] = [
  { to: "/corporate-orders", key: "nav_corporate" },
  { to: "/pricing", key: "nav_pricing" },
];

export function Header() {
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [open, setOpen] = useState<null | "occasions" | "studio" | "business">(
    null,
  );
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node))
        setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 lg:gap-4 lg:px-6 lg:py-4">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2"
          onClick={() => setMobileOpen(false)}
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gold-gradient shadow-warm">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight lg:text-xl">
            {t("brand")}
          </span>
        </Link>

        <nav
          ref={wrapperRef}
          className="ml-2 hidden flex-1 items-center gap-0.5 lg:flex xl:gap-1"
        >
          <TopLink to="/" exact>
            {t("nav_home")}
          </TopLink>
          <TopLink to="/catalog">{t("nav_catalog")}</TopLink>
          <Dropdown
            label={t("nav_occasions")}
            id="occasions"
            open={open === "occasions"}
            onToggle={(v) => setOpen(v ? "occasions" : null)}
            items={OCCASIONS_MENU}
            t={t}
            onNavigate={() => setOpen(null)}
          />
          <Dropdown
            label={t("nav_studio")}
            id="studio"
            open={open === "studio"}
            onToggle={(v) => setOpen(v ? "studio" : null)}
            items={STUDIO_MENU}
            t={t}
            onNavigate={() => setOpen(null)}
          />
          <Dropdown
            label={t("nav_business")}
            id="business"
            open={open === "business"}
            onToggle={(v) => setOpen(v ? "business" : null)}
            items={BUSINESS_MENU}
            t={t}
            onNavigate={() => setOpen(null)}
          />
          <TopLink to="/about">{t("nav_about")}</TopLink>
          <TopLink to="/contact">{t("nav_contact")}</TopLink>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <LanguageSelector />
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="hidden items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1.5 text-sm text-foreground/80 transition hover:text-foreground md:inline-flex"
            >
              <UserRound className="h-4 w-4 text-primary/70" />
              <span className="hidden xl:inline">{t("nav_dashboard")}</span>
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
            to="/studio"
            className="hidden shrink-0 rounded-full bg-gold-gradient px-4 py-2 text-sm font-medium text-primary-foreground shadow-warm transition hover:opacity-95 md:inline-flex"
          >
            {t("cta_create_gift")}
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-full border border-border/70 lg:hidden"
            aria-label="Menu"
          >
            {mobileOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border/60 bg-background/95 lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
            <MobileLink to="/" onNav={() => setMobileOpen(false)} exact>
              {t("nav_home")}
            </MobileLink>
            <MobileLink to="/catalog" onNav={() => setMobileOpen(false)}>
              {t("nav_catalog")}
            </MobileLink>
            <MobileGroup label={t("nav_occasions")}>
              {OCCASIONS_MENU.map((n) => (
                <MobileLink
                  key={`o-${n.key}`}
                  to={n.to}
                  onNav={() => setMobileOpen(false)}
                  nested
                >
                  {t(n.key)}
                </MobileLink>
              ))}
            </MobileGroup>
            <MobileGroup label={t("nav_studio")}>
              {STUDIO_MENU.map((n) => (
                <MobileLink
                  key={`s-${n.key}`}
                  to={n.to}
                  onNav={() => setMobileOpen(false)}
                  nested
                >
                  {t(n.key)}
                </MobileLink>
              ))}
            </MobileGroup>
            <MobileGroup label={t("nav_business")}>
              {BUSINESS_MENU.map((n) => (
                <MobileLink
                  key={`b-${n.key}`}
                  to={n.to}
                  onNav={() => setMobileOpen(false)}
                  nested
                >
                  {t(n.key)}
                </MobileLink>
              ))}
            </MobileGroup>
            <MobileLink to="/about" onNav={() => setMobileOpen(false)}>
              {t("nav_about")}
            </MobileLink>
            <MobileLink to="/contact" onNav={() => setMobileOpen(false)}>
              {t("nav_contact")}
            </MobileLink>
            <Link
              to="/studio"
              onClick={() => setMobileOpen(false)}
              className="mt-2 inline-flex justify-center rounded-full bg-gold-gradient px-4 py-2 text-sm font-medium text-primary-foreground shadow-warm"
            >
              {t("cta_create_gift")}
            </Link>
            <Link
              to={isAuthenticated ? "/dashboard" : "/login"}
              onClick={() => setMobileOpen(false)}
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

function TopLink({
  to,
  exact,
  children,
}: {
  to: string;
  exact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      activeOptions={{ exact }}
      className="rounded-full px-3 py-1.5 text-sm whitespace-nowrap text-muted-foreground transition hover:bg-secondary hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-foreground"
    >
      {children}
    </Link>
  );
}

function Dropdown({
  label,
  id,
  open,
  onToggle,
  items,
  t,
  onNavigate,
}: {
  label: string;
  id: string;
  open: boolean;
  onToggle: (v: boolean) => void;
  items: NavLeaf[];
  t: (k: string) => string;
  onNavigate: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`menu-${id}`}
        onClick={() => onToggle(!open)}
        className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition ${
          open
            ? "bg-secondary text-foreground"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        }`}
      >
        {label}
        <ChevronDown
          className={`h-3.5 w-3.5 opacity-60 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          id={`menu-${id}`}
          role="menu"
          className="absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-border/70 bg-popover p-1.5 shadow-warm"
        >
          {items.map((n, i) => (
            <Link
              key={`${n.to}-${n.key}-${i}`}
              to={n.to}
              onClick={onNavigate}
              role="menuitem"
              className="block rounded-xl px-3 py-2 text-sm text-foreground/80 transition hover:bg-secondary hover:text-foreground"
            >
              {t(n.key)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MobileLink({
  to,
  onNav,
  exact,
  nested,
  children,
}: {
  to: string;
  onNav: () => void;
  exact?: boolean;
  nested?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      onClick={onNav}
      activeOptions={{ exact }}
      className={`rounded-lg px-3 py-2 text-sm text-foreground/80 transition hover:bg-secondary data-[status=active]:bg-secondary data-[status=active]:text-foreground ${
        nested ? "pl-6 text-foreground/70" : ""
      }`}
    >
      {children}
    </Link>
  );
}

function MobileGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-1">
      <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}