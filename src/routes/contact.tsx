import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { useI18n } from "@/lib/i18n";
import { Mail, MapPin, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Project Joy" },
      { name: "description", content: "Questions, partnerships, or love notes — we read every message." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { t } = useI18n();
  return (
    <SiteLayout>
      <PageHeader eyebrow={t("nav_contact")} title={t("page_contact_title")} subtitle={t("page_contact_sub")} />
      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-5">
            {[
              { icon: Mail, label: t("contact_email_label"), value: "hello@projectjoy.app" },
              { icon: MessageCircle, label: t("contact_support_label"), value: t("contact_support_value") },
              { icon: MapPin, label: t("contact_studio_label"), value: t("contact_studio_value") },
            ].map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-5">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-gold-gradient shadow-warm">
                    <Icon className="h-5 w-5 text-primary-foreground" />
                  </span>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{c.label}</div>
                    <div className="text-base">{c.value}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <form
            onSubmit={(e) => e.preventDefault()}
            className="rounded-3xl border border-border/70 bg-card p-8 shadow-warm"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <Field label={t("name")} placeholder={t("contact_name_ph")} />
              <Field label={t("email")} placeholder={t("contact_email_ph")} type="email" />
            </div>
            <div className="mt-5">
              <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t("message")}
              </label>
              <textarea
                rows={6}
                placeholder={t("contact_message_ph")}
                className="mt-2 w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/50"
              />
            </div>
            <button
              type="submit"
              className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-gold-gradient px-6 py-3.5 text-sm font-medium text-primary-foreground shadow-warm"
            >
              {t("send")}
            </button>
          </form>
        </div>
      </section>
    </SiteLayout>
  );
}

function Field({ label, placeholder, type = "text" }: { label: string; placeholder: string; type?: string }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className="mt-2 w-full rounded-full border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/50"
      />
    </div>
  );
}