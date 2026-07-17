import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { useI18n } from "@/lib/i18n";
import { Wand2, Image as ImageIcon, Type, Palette, Send } from "lucide-react";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Create a Greeting — Project Joy" },
      { name: "description", content: "Compose, personalize, and send a beautiful digital greeting in minutes." },
    ],
  }),
  component: CreatePage,
});

function CreatePage() {
  const { t } = useI18n();
  const steps = [
    { icon: Palette, label: "Template" },
    { icon: Type, label: "Message" },
    { icon: ImageIcon, label: "Photo" },
    { icon: Send, label: "Send" },
  ];
  return (
    <SiteLayout>
      <PageHeader eyebrow={t("nav_create")} title={t("page_create_title")} subtitle={t("page_create_sub")} />
      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div className="rounded-3xl border border-border/70 bg-card p-8 shadow-warm">
            <div className="flex flex-wrap items-center gap-3">
              {steps.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs font-medium">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    {s.label}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 space-y-5">
              <Field label="Occasion" placeholder="Birthday, anniversary, holiday…" />
              <Field label="Recipient name" placeholder="Anna" />
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Your message
                </label>
                <textarea
                  rows={5}
                  placeholder="Write something warm — we'll style it beautifully."
                  className="mt-2 w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/50"
                />
              </div>
              <button className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold-gradient px-6 py-3.5 text-sm font-medium text-primary-foreground shadow-warm">
                <Wand2 className="h-4 w-4" />
                {t("cta_create")}
              </button>
            </div>
          </div>

          <div className="relative flex items-center justify-center rounded-3xl border border-border/70 bg-warm-gradient p-8">
            <div className="w-72 rotate-[-3deg] rounded-3xl border border-border/70 bg-card p-8 shadow-warm">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Preview</div>
              <div className="mt-6 font-display text-3xl leading-tight">Happy Birthday, Anna</div>
              <p className="mt-4 text-sm italic text-muted-foreground">
                "May your year be filled with soft mornings, deep laughter, and everything you quietly hope for."
              </p>
              <div className="mt-8 flex items-center justify-between">
                <span className="font-display text-sm italic">— With love</span>
                <span className="text-xs text-muted-foreground">Project Joy</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</label>
      <input
        placeholder={placeholder}
        className="mt-2 w-full rounded-full border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary/50"
      />
    </div>
  );
}