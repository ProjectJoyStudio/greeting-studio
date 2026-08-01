import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, Sparkles, Upload, Wand2, Coins, Wallet, Play } from "lucide-react";
import { toast } from "sonner";

import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  generateLiveCardImage,
  listOwnLiveCards,
  selectLiveCardImage,
  uploadLiveCardImage,
  discardLiveCardImage,
} from "@/lib/live-cards/live-cards.functions";
import {
  LIVE_CARD_RATIOS,
  type LiveCardAsset,
  type LiveCardAnimation,
  type LiveCardRatio,
} from "@/lib/live-cards/types";
import { AnimationStep } from "@/components/live-cards/AnimationStep";
import { LiveCardViewer } from "@/components/live-cards/LiveCardViewer";

export const Route = createFileRoute("/live-cards")({
  head: () => ({
    meta: [
      { title: "Live greeting cards — Project Joy" },
      {
        name: "description",
        content:
          "Create the picture for your live greeting card: describe it in your own words or upload your own photo, and keep it in your Project Joy account.",
      },
      { property: "og:title", content: "Live greeting cards — Project Joy" },
      {
        property: "og:description",
        content: "Describe or upload the picture for your living greeting and preview it instantly.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LiveCardsPage,
});

const RATIO_CLASS: Record<LiveCardRatio, string> = {
  "1:1": "aspect-square",
  "4:5": "aspect-[4/5]",
  "9:16": "aspect-[9/16]",
  "16:9": "aspect-[16/9]",
};

/**
 * Every visit to the creation page starts its own private session, so the
 * page always opens clean. Finished work and drafts stay safe in the personal
 * account and are opened from there on purpose.
 */
function useLiveCardSession(): [string | null, () => void] {
  const [sessionId, setSessionId] = useState<string | null>(null);
  useEffect(() => {
    // Any leftovers of an earlier visit are cleared here.
    try {
      window.localStorage.removeItem("joy.live-cards.session");
      window.localStorage.removeItem("joy.live-cards.motion");
    } catch {
      /* nothing to clean up */
    }
    setSessionId(crypto.randomUUID());
  }, []);
  // A finished live greeting card is kept in the account; the next project
  // always starts from a completely new, independent session.
  const reset = () => {
    try {
      window.localStorage.removeItem("joy.live-cards.motion");
    } catch {
      /* nothing to clean up */
    }
    setSessionId(crypto.randomUUID());
  };
  return [sessionId, reset];
}

function LiveCardsPage() {
  const { t, lang } = useI18n();
  const { isAuthenticated } = useAuth();
  const generate = useServerFn(generateLiveCardImage);
  const upload = useServerFn(uploadLiveCardImage);
  const select = useServerFn(selectLiveCardImage);
  const discard = useServerFn(discardLiveCardImage);
  const fileRef = useRef<HTMLInputElement>(null);

  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState<LiveCardRatio>("1:1");
  const [busy, setBusy] = useState<null | "generate" | "upload" | "select">(null);
  const [current, setCurrent] = useState<LiveCardAsset | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [restored, setRestored] = useState(false);
  const [stage, setStage] = useState<"image" | "motion">("image");
  const [animation, setAnimation] = useState<LiveCardAnimation | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [sessionId, resetSession] = useLiveCardSession();

  const recent = useQuery({
    queryKey: ["live-cards", "session", sessionId],
    queryFn: () => listOwnLiveCards({ data: { sessionId: sessionId ?? undefined } }),
    enabled: isAuthenticated && Boolean(sessionId),
  });

  /** Up to three starting pictures may be created per project. */
  const MAX_ATTEMPTS = 3;
  const generatedCount = (recent.data ?? []).filter((c) => c.source === "generated").length;
  const attemptsLeft = Math.max(0, MAX_ATTEMPTS - generatedCount);

  // The database is the source of truth: after a refresh the session is
  // rebuilt from the stored pictures and their statuses.
  useEffect(() => {
    if (restored || !recent.data?.length) return;
    const chosen = recent.data.find((card) => card.selected) ?? recent.data[0];
    setCurrent(chosen);
    setSelectedId(chosen.selected ? chosen.id : null);
    if (chosen.selected) setStage("motion");
    if (chosen.prompt) setPrompt(chosen.prompt);
    if (chosen.aspectRatio && (LIVE_CARD_RATIOS as readonly string[]).includes(chosen.aspectRatio)) {
      setRatio(chosen.aspectRatio as LiveCardRatio);
    }
    setRestored(true);
  }, [recent.data, restored]);

  async function runGenerate() {
    if (prompt.trim().length < 3) return;
    if (attemptsLeft <= 0) {
      toast.error(t("lc_attempts_done"));
      return;
    }
    setBusy("generate");
    setRestored(true);
    try {
      const result = await generate({
        data: { prompt, aspectRatio: ratio, promptLang: lang, sessionId: sessionId ?? undefined },
      });
      if (!result.ok) {
        toast.error(t("lc_failed"));
        return;
      }
      setCurrent(result.card);
      setSelectedId(null);
      toast.success(t("lc_saved"));
      void recent.refetch();
    } catch {
      toast.error(t("lc_failed"));
    } finally {
      setBusy(null);
    }
  }

  async function useThisImage() {
    if (!current) return;
    setBusy("select");
    try {
      const result = await select({ data: { cardId: current.id } });
      if (!result.ok) {
        toast.error(t("lc_failed"));
        return;
      }
      setCurrent(result.card);
      setSelectedId(result.card.id);
      setStage("motion");
      toast.success(t("lc_selected_toast"));
      void recent.refetch();
    } catch {
      toast.error(t("lc_failed"));
    } finally {
      setBusy(null);
    }
  }

  /**
   * Confirmed replacement: the current picture is not destroyed. It moves to
   * the deleted source images, exactly like a rejected greeting card, and the
   * person returns to the editor with their description still filled in.
   */
  async function handleConfirmReplace() {
    if (!current) return;
    setConfirmReplace(false);
    try {
      await discard({ data: { cardId: current.id } });
    } catch {
      // Already unreachable for the person; the recycle bin keeps the record.
    }
    setCurrent(null);
    setSelectedId(null);
    setStage("image");
    toast.success(t("lc_discarded"));
    void recent.refetch();
  }

  /** Everything of the finished project leaves the workspace, nothing is lost. */
  function startNewProject() {
    setCurrent(null);
    setSelectedId(null);
    setAnimation(null);
    setViewerOpen(false);
    setPrompt("");
    setRatio("1:1");
    setStage("image");
    setRestored(true);
    resetSession();
    void recent.refetch();
  }

  async function uploadFile(file: File) {
    setBusy("upload");
    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let i = 0; i < buffer.length; i += 1) binary += String.fromCharCode(buffer[i]);
      const result = await upload({
        data: {
          fileBase64: btoa(binary),
          contentType: file.type || "image/png",
          prompt,
          aspectRatio: ratio,
          sessionId: sessionId ?? undefined,
        },
      });
      if (!result.ok) {
        toast.error(t("lc_failed"));
        return;
      }
      setCurrent(result.card);
      setSelectedId(null);
      toast.success(t("lc_saved"));
      void recent.refetch();
    } catch {
      toast.error(t("lc_failed"));
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <SiteLayout>
      <PageHeader title={t("lc_title")} subtitle={t("lc_sub")} />

      <section
        className={`mx-auto grid w-full max-w-7xl gap-8 px-4 pb-20 lg:px-6 ${
          stage === "motion" ? "" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
        }`}
      >
        {/* Composer ------------------------------------------------------- */}
        <div className="min-w-0 space-y-6">
          {stage === "motion" && current ? (
            <AnimationStep
              card={current}
              sessionId={sessionId}
              onChangeImage={() => setStage("image")}
              onAnimation={setAnimation}
              onNewProject={startNewProject}
            />
          ) : (
          <>
          <div className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-warm">
            <label
              htmlFor="lc-prompt"
              className="font-display text-lg font-semibold tracking-tight"
            >
              {t("lc_prompt_label")}
            </label>
            <textarea
              id="lc-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              maxLength={1000}
              placeholder={t("lc_prompt_ph")}
              className="mt-3 w-full resize-none rounded-2xl border border-border/60 bg-background/70 p-4 text-sm leading-relaxed outline-none transition focus:border-primary/60"
            />

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("lc_ratio")}
              </span>
              {LIVE_CARD_RATIOS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRatio(value)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    ratio === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {attemptsLeft > 0 && (
                <button
                  type="button"
                  disabled={!isAuthenticated || busy !== null || prompt.trim().length < 3}
                  onClick={runGenerate}
                  className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-6 py-3 text-sm font-semibold text-primary-foreground shadow-warm transition disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy === "generate" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  {generatedCount > 0 ? t("lc_regenerate") : t("lc_generate")}
                </button>
              )}

              {!current && (
              <button
                type="button"
                disabled={!isAuthenticated || busy !== null}
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-full border border-border/60 px-6 py-3 text-sm font-medium transition hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy === "upload" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {busy === "upload" ? t("lc_uploading") : t("lc_upload")}
              </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadFile(file);
                }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t("lc_upload_hint")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {attemptsLeft > 0
                ? `${t("lc_attempts_left")} ${attemptsLeft}/${MAX_ATTEMPTS}`
                : t("lc_attempts_done")}
            </p>

            {!isAuthenticated && (
              <p className="mt-4 text-sm text-muted-foreground">
                <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                  {t("lc_login")}
                </Link>
              </p>
            )}
          </div>

          {/* Reserved panels for the credit phase -------------------------- */}
          <div className="grid gap-4 sm:grid-cols-2">
            <ReservedPanel
              icon={<Coins className="h-4 w-4" />}
              title={t("lc_price_title")}
              note={t("lc_price_soon")}
              badge={t("lc_soon")}
            >
              <span className="font-display text-2xl text-muted-foreground/60">—</span>
            </ReservedPanel>
            <ReservedPanel
              icon={<Wallet className="h-4 w-4" />}
              title={t("lc_balance_title")}
              note={t("lc_balance_soon")}
              badge={t("lc_soon")}
            >
              <span className="font-display text-2xl text-muted-foreground/60">—</span>
            </ReservedPanel>
          </div>
          </>
          )}
        </div>

        {/* Preview — hidden while the animation stage owns the full width -- */}
        {stage === "image" ? (
        <div className="space-y-6">
          <div className="rounded-3xl border border-border/60 bg-card/70 p-4 shadow-warm lg:sticky lg:top-24">
            <div
              className={`relative w-full overflow-hidden rounded-2xl bg-muted/40 ${RATIO_CLASS[ratio]}`}
            >
              {animation?.status === "ready" && animation.videoUrl ? (
                <video
                  src={animation.videoUrl}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : current?.imageUrl ? (
                <img
                  src={current.imageUrl}
                  alt={current.prompt || t("lc_title")}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-muted-foreground">
                  {busy === "generate" ? (
                    <>
                      <Loader2 className="h-7 w-7 animate-spin text-primary" />
                      <span className="text-sm">{t("lc_working")}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-7 w-7 opacity-50" />
                      <span className="text-sm">{t("lc_preview_empty")}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {current && stage === "image" && (
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={useThisImage}
                  className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    selectedId === current.id
                      ? "border border-primary/60 bg-primary/10 text-primary"
                      : "bg-gold-gradient text-primary-foreground shadow-warm"
                  }`}
                >
                  {busy === "select" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {selectedId === current.id ? t("lc_selected") : t("lc_use_image")}
                </button>
                <button
                  type="button"
                  disabled={busy !== null || (attemptsLeft <= 0 && generatedCount >= MAX_ATTEMPTS)}
                  onClick={() => (attemptsLeft > 0 ? void runGenerate() : setConfirmReplace(true))}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-border/60 px-5 py-3 text-sm font-medium transition hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy === "generate" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  {t("lc_regenerate")}
                </button>
              </div>
            )}

            {animation?.status === "ready" && animation.videoUrl && (
              <button
                type="button"
                onClick={() => setViewerOpen(true)}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border/60 px-5 py-3 text-sm font-medium transition hover:border-primary/50"
              >
                <Play className="h-4 w-4" />
                {t("la_open_viewer")}
              </button>
            )}
          </div>

          {isAuthenticated && (recent.data?.length ?? 0) > 0 && (
            <div className="rounded-3xl border border-border/60 bg-card/60 p-5">
              <h2 className="font-display text-base font-semibold tracking-tight">
                {t("lc_recent")}
              </h2>
              <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-6">
                {recent.data!.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => {
                      setCurrent(card);
                      setSelectedId(card.selected ? card.id : null);
                      if (card.prompt) setPrompt(card.prompt);
                    }}
                    className={`group overflow-hidden rounded-xl border transition ${
                      card.selected
                        ? "border-primary ring-2 ring-primary/40"
                        : "border-border/50 hover:border-primary/50"
                    }`}
                    title={
                      card.source === "upload" ? t("lc_source_upload") : t("lc_source_generated")
                    }
                  >
                    {card.imageUrl ? (
                      <img
                        src={card.imageUrl}
                        alt={card.prompt || t("lc_title")}
                        loading="lazy"
                        className="aspect-square w-full object-cover"
                      />
                    ) : (
                      <span className="block aspect-square w-full bg-muted/50" />
                    )}
                    <span
                      className={`block px-1 py-1 text-[10px] font-medium leading-tight ${
                        card.selected ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {card.selected ? t("lc_status_selected") : t("lc_status_not_selected")}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        ) : null}
      </section>

      {viewerOpen && animation?.videoUrl && (
        <LiveCardViewer videoUrl={animation.videoUrl} title={null} onClose={() => setViewerOpen(false)} />
      )}

      {confirmReplace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-5 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-6 shadow-xl">
            <h3 className="font-display text-lg font-semibold text-foreground">{t("lc_replace_title")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("lc_replace_desc")}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmReplace(false)}
                className="rounded-full border border-border/60 px-5 py-2.5 text-sm hover:bg-secondary"
              >
                {t("lc_cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmReplace}
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
              >
                {t("lc_replace_confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </SiteLayout>
  );
}

function ReservedPanel({
  icon,
  title,
  note,
  badge,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  note: string;
  badge: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-card/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-sm font-medium">
          {icon}
          {title}
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          {badge}
        </span>
      </div>
      <div className="mt-3">{children}</div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{note}</p>
    </div>
  );
}