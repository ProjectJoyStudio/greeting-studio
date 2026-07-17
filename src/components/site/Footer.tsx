import { Link } from "@tanstack/react-router";
import { Sparkles, Instagram, Twitter, Send } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-24 border-t border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gold-gradient shadow-warm">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </span>
              <span className="font-display text-xl font-semibold">{t("brand")}</span>
            </div>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              {t("footer_tag")}
            </p>
            <div className="mt-6 flex gap-2">
              {[Instagram, Twitter, Send].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="grid h-9 w-9 place-items-center rounded-full border border-border/70 text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                  aria-label="social"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <FooterCol title={t("footer_product")} links={[
            { to: "/catalog", label: t("nav_catalog") },
            { to: "/daily", label: t("nav_daily") },
            { to: "/create", label: t("nav_create") },
            { to: "/pricing", label: t("nav_pricing") },
          ]} />
          <FooterCol title={t("footer_company")} links={[
            { to: "/about", label: t("nav_about") },
            { to: "/contact", label: t("nav_contact") },
            { to: "/personal-orders", label: t("nav_personal") },
            { to: "/corporate-orders", label: t("nav_corporate") },
          ]} />
          <FooterCol title={t("footer_legal")} links={[
            { to: "/about", label: "Terms" },
            { to: "/about", label: "Privacy" },
            { to: "/about", label: "Cookies" },
          ]} />
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground md:flex-row md:items-center">
          <span>{t("footer_rights")}</span>
          <span className="font-display italic">{t("tagline")}</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <h4 className="font-display text-sm font-semibold uppercase tracking-widest text-foreground/90">
        {title}
      </h4>
      <ul className="mt-4 space-y-2">
        {links.map((l, i) => (
          <li key={i}>
            <Link
              to={l.to}
              className="text-sm text-muted-foreground transition hover:text-foreground"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}