import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2, Plus, Trash2, Copy, X } from "lucide-react";
import { toast } from "sonner";

import { DashboardPageHeader } from "@/components/dashboard/DashboardLayout";
import { CardPreview } from "@/components/greeting-card/CardPreview";
import { useI18n } from "@/lib/i18n";
import { deleteOwnCard, listOwnCards } from "@/lib/greeting-card/cards.functions";
import { normalizeTextDesign } from "@/lib/greeting-card/types";
import { downloadFinalCard } from "@/lib/greeting-card/compose";

export const Route = createFileRoute("/dashboard/cards")({
  component: MyCardsPage,
});

function MyCardsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchCards = useServerFn(listOwnCards);
  const removeCard = useServerFn(deleteOwnCard);
  const [open, setOpen] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["my-greeting-cards"],
    queryFn: () => fetchCards({ data: { status: "saved" } }),
  });

  const del = useMutation({
    mutationFn: (cardId: string) => removeCard({ data: { cardId } }),
    onSuccess: () => {
      toast.success(t("gc_deleted"));
      setOpen(null);
      queryClient.invalidateQueries({ queryKey: ["my-greeting-cards"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("gc_err_save")),
  });

  const cards = data ?? [];
  const active = cards.find((c) => c.id === open) ?? null;

  return (
    <div>
      <DashboardPageHeader titleKey="gc_my_cards_title" subtitleKey="gc_my_cards_sub" />

      <Link
        to="/create-card"
        className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
      >
        <Plus className="h-4 w-4" />
        {t("gc_new_card")}
      </Link>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("gc_loading")}
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-card/70 p-8 text-center text-sm text-muted-foreground">
          {t("gc_empty")}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((c) => {
            const design = normalizeTextDesign(c.text_design);
            return (
              <article key={c.id} className="overflow-hidden rounded-2xl border border-border/60 bg-card/70 p-3">
                <CardPreview imageUrl={c.image_url} text={c.greeting_text} design={design} alt={c.prompt} />
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <button onClick={() => setOpen(c.id)} className="rounded-full border border-border/60 px-3 py-1.5 hover:bg-secondary">
                    {t("gc_open")}
                  </button>
                  <button
                    onClick={() =>
                      c.image_url
                        ? downloadFinalCard(c.image_url, c.greeting_text, design, `project-joy-${c.id}.png`)
                        : undefined
                    }
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 hover:bg-secondary"
                  >
                    <Download className="h-3.5 w-3.5" /> {t("gc_download")}
                  </button>
                  <button
                    onClick={() =>
                      navigate({
                        to: "/create-card",
                        search: { prompt: c.prompt, text: c.greeting_text, keywords: c.keywords.join(", ") },
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 hover:bg-secondary"
                  >
                    <Copy className="h-3.5 w-3.5" /> {t("gc_create_similar")}
                  </button>
                  <button
                    onClick={() => del.mutate(c.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 px-3 py-1.5 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> {t("gc_delete")}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-5 backdrop-blur-sm">
          <div className="w-full max-w-[min(92vw,720px)]">
            <button
              onClick={() => setOpen(null)}
              className="mb-3 ml-auto flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card"
              aria-label={t("gc_close")}
            >
              <X className="h-4 w-4" />
            </button>
            <CardPreview
              imageUrl={active.image_url}
              text={active.greeting_text}
              design={normalizeTextDesign(active.text_design)}
              alt={active.prompt}
            />
          </div>
        </div>
      )}
    </div>
  );
}