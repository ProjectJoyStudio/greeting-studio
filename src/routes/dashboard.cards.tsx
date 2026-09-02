import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2, Plus, Trash2, X, Share2 } from "lucide-react";
import { toast } from "sonner";

import { DashboardPageHeader } from "@/components/dashboard/DashboardLayout";
import { CardPreview } from "@/components/greeting-card/CardPreview";
import { ShareDialog } from "@/components/greeting-card/ShareDialog";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  deleteOwnCard,
  listOwnCards,
  logCardEvent,
  markCardDelivered,
  saveCardProject,
} from "@/lib/greeting-card/cards.functions";
import { normalizeTextDesign } from "@/lib/greeting-card/types";
import { composeFinalCard, downloadFinalCard } from "@/lib/greeting-card/compose";
import { uploadFinalCardImage } from "@/lib/greeting-card/save-final";

export const Route = createFileRoute("/dashboard/cards")({
  component: MyCardsPage,
});

function MyCardsPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchCards = useServerFn(listOwnCards);
  const removeCard = useServerFn(deleteOwnCard);
  const saveProject = useServerFn(saveCardProject);
  const trackEvent = useServerFn(logCardEvent);
  const deliverCard = useServerFn(markCardDelivered);

  const [open, setOpen] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [share, setShare] = useState<{ id: string; url: string; title: string } | null>(null);
  const [sharing, setSharing] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["my-greeting-cards"],
    queryFn: () => fetchCards({ data: { status: "saved" } }),
  });

  /** Unfinished card orders: they can only be continued, never sent. */
  const { data: drafts } = useQuery({
    queryKey: ["my-greeting-cards", "preview"],
    queryFn: () => fetchCards({ data: { status: "preview" } }),
  });


  const del = useMutation({
    mutationFn: (cardId: string) => removeCard({ data: { cardId } }),
    onSuccess: () => {
      toast.success(t("gc_deleted"));
      setOpen(null);
      setConfirmDelete(null);
      queryClient.invalidateQueries({ queryKey: ["my-greeting-cards"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t("gc_err_save")),
  });

  const cards = data ?? [];
  const active = cards.find((c) => c.id === open) ?? null;

  /**
   * Download or Share completes the order: the card is marked delivered and
   * leaves the personal account for good. Previewing never does this.
   */
  async function finishCard(cardId: string, channel: string) {
    try {
      await deliverCard({ data: { cardId, channel } });
    } catch {
      /* the card stays visible if the state could not be written */
    }
    setOpen((cur) => (cur === cardId ? null : cur));
    setShare((cur) => (cur?.id === cardId ? null : cur));
    queryClient.invalidateQueries({ queryKey: ["my-greeting-cards"] });
  }

  /** Sharing always saves first, so a link never points at an unsaved card. */
  async function handleShare(card: (typeof cards)[number]) {
    setSharing(card.id);
    try {
      const design = normalizeTextDesign(card.text_design);
      let finalPath = card.final_storage_path;
      if (!finalPath && user && card.image_url) {
        finalPath = await uploadFinalCardImage(user.id, card.id, card.image_url, card.greeting_text, design);
      }
      const res = await saveProject({
        data: {
          cardId: card.id,
          title: card.title ?? "",
          language: card.language ?? lang,
          greetingText: card.greeting_text,
          greetingMode: card.greeting_mode === "keywords" ? "keywords" : "manual",
          keywords: card.keywords ?? [],
          prompt: card.prompt,
          textDesign: design,
          finalStoragePath: finalPath,
          enableShare: true,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["my-greeting-cards"] });
      if (!res.shareSlug) throw new Error("no_link");
      setShare({
        id: card.id,
        url: `${window.location.origin}/c/${res.shareSlug}`,
        title: card.title || t("gc_shared_title"),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("gc_err_save"));
    } finally {
      setSharing(null);
    }
  }

  return (
    <div>
      <DashboardPageHeader titleKey="gc_my_cards_title" subtitleKey="gc_my_cards_sub" />

      <Link
        to="/create-card"
        search={{ fresh: "1" }}
        className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
      >
        <Plus className="h-4 w-4" />
        {t("gc_new_card")}
      </Link>

      {(drafts ?? []).length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-display text-lg font-semibold text-foreground">
            {t("gc_unfinished_title")}
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {(drafts ?? []).map((c) => (
              <article
                key={c.id}
                className="overflow-hidden rounded-2xl border border-dashed border-border/70 bg-card/60 p-3"
              >
                <CardPreview
                  imageUrl={c.image_url}
                  text={c.greeting_text}
                  design={normalizeTextDesign(c.text_design)}
                  alt={c.prompt}
                />
                <div className="mt-3 flex items-center justify-between gap-2 px-1">
                  <h3 className="truncate font-display text-base font-semibold text-foreground">
                    {c.title || t("gc_untitled")}
                  </h3>
                  <span className="shrink-0 rounded-full border border-border/60 px-2.5 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                    {t("gc_draft_badge")}
                  </span>
                </div>
                <div className="mt-3 px-1">
                  <Link
                    to="/create-card"
                    search={{ cardId: c.id }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
                  >
                    {t("gc_continue")}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}


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
                <div className="mt-3 space-y-0.5 px-1">
                  <h3 className="truncate font-display text-base font-semibold text-foreground">
                    {c.title || t("gc_untitled")}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {t("gc_created")}: {new Date(c.created_at).toLocaleDateString(lang)}
                  </p>
                  {c.language && (
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.language}</p>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <button onClick={() => setOpen(c.id)} className="rounded-full border border-border/60 px-3 py-1.5 hover:bg-secondary">
                    {t("gc_open")}
                  </button>
                  <button
                    onClick={() => handleShare(c)}
                    disabled={sharing === c.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 font-medium text-primary-foreground disabled:opacity-60"
                  >
                    {sharing === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
                    {t("gc_share")}
                  </button>
                  <button
                    onClick={() =>
                      c.image_url
                        ? downloadFinalCard(c.image_url, c.greeting_text, design, `project-joy-${c.id}.png`).then(
                            () => finishCard(c.id, "download"),
                          )
                        : undefined
                    }
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 hover:bg-secondary"
                  >
                    <Download className="h-3.5 w-3.5" /> {t("gc_download")}
                  </button>
                  <button
                    onClick={() => navigate({ to: "/create-card", search: { fresh: "1" } })}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 hover:bg-secondary"
                  >
                    <Plus className="h-3.5 w-3.5" /> {t("gc_new_card")}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(c.id)}
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

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-xl">
            <h3 className="font-display text-lg font-semibold text-foreground">{t("gc_confirm_delete_title")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("gc_confirm_delete_desc")}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-full border border-border/60 px-5 py-2.5 text-sm hover:bg-secondary"
              >
                {t("gc_cancel")}
              </button>
              <button
                onClick={() => del.mutate(confirmDelete)}
                className="rounded-full bg-destructive px-5 py-2.5 text-sm font-medium text-destructive-foreground"
              >
                {t("gc_confirm_delete_yes")}
              </button>
            </div>
          </div>
        </div>
      )}

      {share && (
        <ShareDialog
          open
          onClose={() => setShare(null)}
          url={share.url}
          title={share.title}
          // Sharing keeps the card in the cabinet: it can always be sent again.
          onShared={(channel) => {
            void trackEvent({ data: { cardId: share.id, eventType: "share", channel } });
          }}
          prepareFile={async () => {
            const card = cards.find((c) => c.id === share.id);
            if (!card?.image_url) throw new Error("media_unavailable");
            const blob = await composeFinalCard(
              card.image_url,
              card.greeting_text ?? "",
              normalizeTextDesign(card.text_design),
            );
            return new File([blob], `project-joy-${card.id}.png`, { type: "image/png" });
          }}
          onDownload={() => {
            const card = cards.find((c) => c.id === share.id);
            if (card?.image_url) {
              void downloadFinalCard(
                card.image_url,
                card.greeting_text,
                normalizeTextDesign(card.text_design),
                `project-joy-${card.id}.png`,
              ).then(() => finishCard(card.id, "download"));
            }
          }}
        />
      )}
    </div>
  );
}
