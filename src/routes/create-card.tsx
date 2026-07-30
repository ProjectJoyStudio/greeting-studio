import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, Wand2, Download, Check, Share2 } from "lucide-react";
import { toast } from "sonner";

import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { CardPreview } from "@/components/greeting-card/CardPreview";
import { TextStylePanel } from "@/components/greeting-card/TextStylePanel";
import { ShareDialog } from "@/components/greeting-card/ShareDialog";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  composeGreetingFromKeywords,
  generateCardImage,
  getOwnCard,
  logCardEvent,
  rejectCard,
  saveCardProject,
} from "@/lib/greeting-card/cards.functions";
import {
  DEFAULT_TEXT_DESIGN,
  normalizeTextDesign,
  type CardTextDesign,
  type GreetingMode,
} from "@/lib/greeting-card/types";
import { downloadFinalCard } from "@/lib/greeting-card/compose";
import { uploadFinalCardImage } from "@/lib/greeting-card/save-final";

type Stage = "edit" | "preview" | "design" | "done";

export const Route = createFileRoute("/create-card")({
  validateSearch: (search: Record<string, unknown>) => ({
    prompt: typeof search.prompt === "string" ? search.prompt.slice(0, 1000) : undefined,
    text: typeof search.text === "string" ? search.text.slice(0, 2000) : undefined,
    keywords: typeof search.keywords === "string" ? search.keywords.slice(0, 500) : undefined,
    cardId: typeof search.cardId === "string" ? search.cardId.slice(0, 60) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Create a greeting card — Project Joy" },
      {
        name: "description",
        content:
          "Describe the artwork, write or compose the greeting, style the text and keep your finished greeting card in your Project Joy account.",
      },
      { property: "og:title", content: "Create a greeting card — Project Joy" },
      {
        property: "og:description",
        content: "Design a personal greeting card and save it to your Project Joy account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreateCardPage,
});

function CreateCardPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const runGenerate = useServerFn(generateCardImage);
  const runCompose = useServerFn(composeGreetingFromKeywords);
  const runReject = useServerFn(rejectCard);
  const runSave = useServerFn(saveCardProject);
  const runLoad = useServerFn(getOwnCard);
  const trackEvent = useServerFn(logCardEvent);

  const [stage, setStage] = useState<Stage>("edit");
  const [prompt, setPrompt] = useState(search.prompt ?? "");
  const [mode, setMode] = useState<GreetingMode>(search.keywords ? "keywords" : "manual");
  const [greeting, setGreeting] = useState(search.text ?? "");
  const [keywords, setKeywords] = useState(search.keywords ?? "");
  const [design, setDesign] = useState<CardTextDesign>({ ...DEFAULT_TEXT_DESIGN });
  const [title, setTitle] = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [composing, setComposing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [card, setCard] = useState<{ id: string; imageUrl: string } | null>(null);

  /** Re-opening a saved postcard restores the whole project, not just the picture. */
  const { data: existing } = useQuery({
    queryKey: ["own-card", search.cardId],
    queryFn: () => runLoad({ data: { cardId: search.cardId! } }),
    enabled: Boolean(search.cardId),
  });

  useEffect(() => {
    if (!existing?.image_url) return;
    setCard({ id: existing.id, imageUrl: existing.image_url });
    setPrompt(existing.prompt ?? "");
    setGreeting(existing.greeting_text ?? "");
    setKeywords((existing.keywords ?? []).join(", "));
    setMode(existing.greeting_mode === "keywords" ? "keywords" : "manual");
    setDesign(normalizeTextDesign(existing.text_design));
    setTitle(existing.title ?? "");
    setStage("design");
  }, [existing]);

  const keywordList = useMemo(
    () => keywords.split(",").map((k: string) => k.trim()).filter(Boolean),
    [keywords],
  );

  async function handleGenerate() {
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    if (prompt.trim().length < 3) {
      toast.error(t("gc_err_prompt"));
      return;
    }
    setGenerating(true);
    try {
      const res = await runGenerate({
        data: { prompt: prompt.trim(), keywords: keywordList, greetingText: greeting, greetingMode: mode },
      });
      if (!res.ok) {
        toast.error(`${t("gc_err_generate")} (${res.errorCode})`);
        return;
      }
      setCard({ id: res.cardId, imageUrl: res.imageUrl });
      setStage("preview");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("gc_err_generate"));
    } finally {
      setGenerating(false);
    }
  }

  async function handleCompose() {
    if (keywordList.length === 0) {
      toast.error(t("gc_err_keywords"));
      return;
    }
    setComposing(true);
    try {
      const res = await runCompose({ data: { keywords: keywordList, language: lang } });
      if (!res.ok) {
        toast.error(t("gc_err_compose"));
        return;
      }
      setGreeting(res.text);
    } catch {
      toast.error(t("gc_err_compose"));
    } finally {
      setComposing(false);
    }
  }

  /** Confirmed replacement: the old card leaves the account for good. */
  async function handleConfirmReplace() {
    if (!card) return;
    setConfirmReplace(false);
    try {
      await runReject({ data: { cardId: card.id } });
    } catch {
      // The card is already unreachable for the user; nothing to restore.
    }
    setCard(null);
    setStage("edit"); // back to the editor with every field still filled in
  }

  /** Saves the picture and the editable project, then returns the share link. */
  async function persist(finalize: boolean): Promise<string | null> {
    if (!card) return null;
    setSaving(true);
    try {
      let finalPath: string | null = null;
      if (user) {
        try {
          finalPath = await uploadFinalCardImage(user.id, card.id, card.imageUrl, greeting, design);
        } catch {
          // The editable project is still saved; the picture can be re-rendered later.
        }
      }
      const res = await runSave({
        data: {
          cardId: card.id,
          title,
          language: lang,
          greetingText: greeting,
          greetingMode: mode,
          keywords: keywordList,
          prompt,
          textDesign: design,
          finalStoragePath: finalPath,
          enableShare: true,
        },
      });
      if (finalize) {
        setStage("done");
        toast.success(t("gc_saved_toast"));
      }
      const url = res.shareSlug ? `${window.location.origin}/c/${res.shareSlug}` : null;
      setShareUrl(url);
      return url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("gc_err_save"));
      return null;
    } finally {
      setSaving(false);
    }
  }

  /** Sharing saves first when the postcard is not stored yet. */
  async function handleShare() {
    const url = shareUrl ?? (await persist(false));
    if (!url) return;
    setShareOpen(true);
  }

  return (
    <SiteLayout>
      <PageHeader title={t("gc_page_title")} subtitle={t("gc_page_sub")} />

      <section className="mx-auto grid w-full max-w-6xl gap-8 px-5 pb-20 lg:grid-cols-[1fr_minmax(320px,460px)] lg:px-8">
        {/* Left: editor / styling */}
        <div className="space-y-6">
          {stage === "edit" || stage === "preview" ? (
            <div className="space-y-5 rounded-2xl border border-border/60 bg-card/70 p-5">
              <div>
                <label className="mb-2 block font-display text-lg font-semibold text-foreground">
                  {t("gc_prompt_label")}
                </label>
                <textarea
                  rows={6}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t("gc_prompt_ph")}
                  className="w-full resize-none rounded-2xl border border-border/60 bg-background px-4 py-3 text-base leading-relaxed outline-none focus:border-primary/60"
                />
                <p className="mt-1 text-xs text-muted-foreground">{t("gc_prompt_hint")}</p>
              </div>

              <div>
                <span className="mb-2 block text-sm font-medium text-foreground">{t("gc_mode_label")}</span>
                <div className="flex flex-wrap gap-2">
                  {(["manual", "keywords"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`rounded-full border px-4 py-2 text-sm transition ${
                        mode === m
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border/60 bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t(m === "manual" ? "gc_mode_manual" : "gc_mode_keywords")}
                    </button>
                  ))}
                </div>
              </div>

              {mode === "keywords" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">{t("gc_keywords_label")}</label>
                  <input
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder={t("gc_keywords_ph")}
                    className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
                  />
                  <button
                    type="button"
                    onClick={handleCompose}
                    disabled={composing}
                    className="mt-2 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-4 py-2 text-sm hover:bg-secondary disabled:opacity-50"
                  >
                    {composing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    {t("gc_compose_btn")}
                  </button>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">{t("gc_greeting_label")}</label>
                <textarea
                  rows={5}
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  placeholder={t("gc_greeting_ph")}
                  className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
                />
                <p className="mt-1 text-xs text-muted-foreground">{t("gc_greeting_hint")}</p>
              </div>

              {stage === "edit" && (
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60"
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {generating ? t("gc_generating") : t("gc_generate_btn")}
                </button>
              )}
            </div>
          ) : null}

          {stage === "design" && (
            <div className="space-y-5 rounded-2xl border border-border/60 bg-card/70 p-5">
              <h2 className="font-display text-xl font-semibold text-foreground">{t("gc_style_title")}</h2>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">{t("gc_title_label")}</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("gc_title_ph")}
                  className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
                />
              </div>
              <textarea
                rows={4}
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                placeholder={t("gc_greeting_ph")}
                className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
              />
              <TextStylePanel design={design} onChange={(patch) => setDesign((d) => ({ ...d, ...patch }))} />
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => persist(true)}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {saving ? t("gc_saving") : t("gc_finish_btn")}
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-full border border-border/60 px-6 py-3 text-sm hover:bg-secondary disabled:opacity-60"
                >
                  <Share2 className="h-4 w-4" />
                  {t("gc_share")}
                </button>
                <button
                  type="button"
                  onClick={() => setStage("preview")}
                  className="rounded-full border border-border/60 px-6 py-3 text-sm hover:bg-secondary"
                >
                  {t("gc_back")}
                </button>
              </div>
            </div>
          )}

          {stage === "done" && (
            <div className="space-y-4 rounded-2xl border border-primary/30 bg-primary/5 p-6">
              <h2 className="font-display text-xl font-semibold text-foreground">{t("gc_done_title")}</h2>
              <p className="text-sm text-muted-foreground">{t("gc_done_sub")}</p>
              <p className="text-sm text-muted-foreground">{t("gc_saved_success")}</p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
                >
                  <Share2 className="h-4 w-4" />
                  {t("gc_share")}
                </button>
                <Link
                  to="/dashboard/cards"
                  className="rounded-full border border-border/60 px-6 py-3 text-sm hover:bg-secondary"
                >
                  {t("gc_open_account")}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setCard(null);
                    setStage("edit");
                  }}
                  className="rounded-full border border-border/60 px-6 py-3 text-sm hover:bg-secondary"
                >
                  {t("gc_start_new")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: live preview */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-border/60 bg-card/70 p-4">
            {generating ? (
              <div className="relative flex aspect-square w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl bg-warm-gradient text-muted-foreground">
                <div className="absolute inset-0 animate-pulse bg-gold-gradient/10" />
                <span className="relative grid h-16 w-16 place-items-center rounded-full bg-card/70 shadow-warm backdrop-blur">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                </span>
                <span className="relative text-sm font-medium tracking-wide">{t("gc_generating")}</span>
                <span className="relative flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </span>
              </div>
            ) : (
              <CardPreview
                imageUrl={card?.imageUrl ?? null}
                text={greeting}
                design={design}
                alt={t("gc_preview_alt")}
              />
            )}

            {stage === "preview" && card && (
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setStage("design")}
                  className="flex-1 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
                >
                  {t("gc_use_card")}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReplace(true)}
                  className="flex-1 rounded-full border border-border/60 px-5 py-3 text-sm hover:bg-secondary"
                >
                  {t("gc_create_another")}
                </button>
              </div>
            )}

            {(stage === "design" || stage === "done") && card && (
              <button
                type="button"
                onClick={() => downloadFinalCard(card.imageUrl, greeting, design)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border/60 px-5 py-3 text-sm hover:bg-secondary"
              >
                <Download className="h-4 w-4" />
                {t("gc_download")}
              </button>
            )}
          </div>
        </aside>
      </section>

      {confirmReplace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-xl">
            <h3 className="font-display text-lg font-semibold text-foreground">{t("gc_replace_title")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("gc_replace_desc")}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmReplace(false)}
                className="rounded-full border border-border/60 px-5 py-2.5 text-sm hover:bg-secondary"
              >
                {t("gc_cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmReplace}
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
              >
                {t("gc_create_new")}
              </button>
            </div>
          </div>
        </div>
      )}

      {shareUrl && card && (
        <ShareDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          url={shareUrl}
          title={title || t("gc_shared_title")}
          onShared={(channel) => trackEvent({ data: { cardId: card.id, eventType: "share", channel } })}
          onDownload={() => downloadFinalCard(card.imageUrl, greeting, design)}
        />
      )}
    </SiteLayout>
  );
}