import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Project Joy" },
      { name: "description", content: "The team behind Project Joy — digital greetings crafted with warmth." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const { t } = useI18n();
  return (
    <SiteLayout>
      <PageHeader eyebrow={t("nav_about")} title={t("page_about_title")} subtitle={t("page_about_sub")} />
      <section className="mx-auto max-w-4xl px-5 py-16 lg:px-8">
        <div className="space-y-6 text-lg leading-relaxed text-foreground/85">
          <p>
            Project Joy started with a simple observation: the greetings people love most feel <em>personal</em>, not perfect. A rushed message on a beautiful card still lands warmer than the fanciest template sent late.
          </p>
          <p>
            So we built a place where the design fades into the background and the feeling comes forward. Four languages, one aesthetic — quiet, warm, and quietly modern.
          </p>
          <p className="font-display text-2xl italic text-foreground">
            "A good greeting is a small, complete gift."
          </p>
          <p>
            We're a small team of designers and engineers working from Berlin, Kyiv, and Lisbon. If our work made someone's day a little softer, we did our job.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-3">
          {[
            { k: "500k+", v: "Greetings sent" },
            { k: "4", v: "Languages" },
            { k: "12", v: "Countries live" },
          ].map((s) => (
            <div key={s.k} className="rounded-3xl border border-border/70 bg-card p-6 text-center">
              <div className="font-display text-4xl font-semibold text-gold-gradient">{s.k}</div>
              <div className="mt-2 text-sm text-muted-foreground">{s.v}</div>
            </div>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}