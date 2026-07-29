import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles, Wand2, Download, Check } from "lucide-react";
import { toast } from "sonner";

import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { CardPreview } from "@/components/greeting-card/CardPreview";
import { TextStylePanel } from "@/components/greeting-card/TextStylePanel";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  composeGreetingFromKeywords,
  generateCardImage,
  rejectCard,
  saveCardDetails,
} from "@/lib/greeting-card/cards.functions";
import { DEFAULT_TEXT_DESIGN, type CardTextDesign, type GreetingMode } from "@/lib/greeting-card/types";
import { downloadFinalCard } from "@/lib/greeting-card/compose";

type Stage = "edit" | "preview" | "design" | "done";

export const Route = createFileRoute("/create-card")({
  validateSearch: (search: Record<string, unknown>) => ({
    prompt: typeof search.prompt === "string" ? search.prompt.slice(0, 1000) : undefined,
    text: typeof search.text === "string" ? search.text.slice(0, 2000) : undefined,
    keywords: typeof search.keywords === "string" ? search.keywords.slice(0, 500) : undefined,
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
  const runSave = useServerFn(saveCardDetails);

  const [stage, setStage] = useState<Stage>("edit");
  const [prompt, setPrompt] = useState(search.prompt ?? "");
  const [mode, setMode] = useState<GreetingMode>(search.keywords ? "keywords" : "manual");
  const [greeting, setGreeting] = useState(search.text ?? "");
  const [keywords, setKeywords] = useState(search.keywords ?? "");
  const [design, setDesign] = useState<CardTextDesign>({ ...DEFAULT_TEXT_DESIGN });

  const [generating, setGenerating] = useState(false);
  const [composing, setComposing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [card, setCard] = useState<{ id: string; imageUrl: string } | null>(null);

  const keywordList = useMemo(
    () => keywords.split(",").map((k) => k.trim()).filter(Boolean),
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

  async function persist(finalize: boolean) {
    if (!card) return;
    setSaving(true);
    try {
      await runSave({
        data: {
          cardId: card.id,
          greetingText: greeting,
          greetingMode: mode,
          keywords: keywordList,
          prompt,
          textDesign: design,
          finalize,
        },
      });
      if (finalize) {
        setStage("done");
        toast.success(t("gc_saved_toast"));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("gc_err_save"));
    } finally {
      setSaving(false);
    }
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
                <label className="mb-1.5 block text-sm font-medium text-foreground">{t("gc_prompt_label")}</label>
                <textarea
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t("gc_prompt_ph")}
                  className="w-full rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
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
                  {t("gc_finish_btn")}
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
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/dashboard/cards"
                  className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground"
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
              <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-2xl bg-muted text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm">{t("gc_generating")}</span>
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
    </SiteLayout>
  );
}