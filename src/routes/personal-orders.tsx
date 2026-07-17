import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { useI18n } from "@/lib/i18n";
import { HandHeart, PenLine, Gift } from "lucide-react";

export const Route = createFileRoute("/personal-orders")({
  head: () => ({
    meta: [
      { title: "Personal Orders — Project Joy" },
      { name: "description", content: "Custom-made digital greetings for the people who matter most." },
    ],
  }),
  component: PersonalOrdersPage,
});

function PersonalOrdersPage() {
  const { t } = useI18n();
  const items = [
    { icon: PenLine, title: "Handwritten note", body: "A designer transcribes your message into a personalized card in your chosen script." },
    { icon: Gift, title: "Bespoke design", body: "One-of-one artwork inspired by the recipient, illustrated for you." },
    { icon: HandHeart, title: "Curated moments", body: "We help you plan an entire year of greetings for the people you love." },
  ];
  return (
    <SiteLayout>
      <PageHeader eyebrow={t("nav_personal")} title={t("page_personal_title")} subtitle={t("page_personal_sub")} />
      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-5 md:grid-cols-3">
          {items.map((it, i) => {
            const Icon = it.icon;
            return (
              <div key={i} className="rounded-3xl border border-border/70 bg-card p-8">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold-gradient shadow-warm">
                  <Icon className="h-5 w-5 text-primary-foreground" />
                </span>
                <h3 className="mt-6 font-display text-xl font-semibold">{it.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground">{it.body}</p>
                <button className="mt-6 rounded-full border border-border px-4 py-2 text-xs font-medium transition hover:border-primary/40">
                  Request quote
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </SiteLayout>
  );
}