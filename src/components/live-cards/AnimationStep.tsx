import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock, Film, Images, Loader2, Lock, Play, Plus, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import { LiveCardViewer } from "./LiveCardViewer";
import { LiveGreetingTextStep } from "./LiveGreetingTextStep";
import {
  getAnimationOptions,
  getLiveCardAnimationProject,
  listLiveCardAnimations,
  refreshLiveCardAnimation,
  regenerateLiveCardAnimation,
  startLiveCardAnimation,
} from "@/lib/live-cards/animations.functions";
import {
  MOTION_PRESET_KEYS,
  PLANNED_VIDEO_DURATIONS,
  type LiveCardAnimation,
  type LiveCardAsset,
} from "@/lib/live-cards/types";
import {
  ANIMATION_DURATION_DEFAULT,
  ANIMATION_DURATIONS,
  ANIMATION_REGENERATE_CREDITS,
  animationDurationCredits,
  normaliseAnimationDuration,
} from "@/lib/live-cards/duration-pricing";
import { useCreditBalance, useRefreshCreditBalance } from "@/lib/credits/useCreditBalance";
import { useLiveCardProjectSpend } from "@/lib/live-cards/useProjectSpend";

const DRAFT_KEY = "joy.live-cards.motion";

/** Statuses that still need to be followed until the engine is done. */
function isPending(status: string): boolean {
  return status === "preparing" || status === "queued" || status === "processing" || status === "storing";
}

export function AnimationStep({
  card,
  sessionId,
  onChangeImage,
  onAnimation,
  onNewProject,
}: {
  card: LiveCardAsset;
  sessionId: string | null;
  onChangeImage: () => void;
  onAnimation: (animation: LiveCardAnimation | null) => void;
  /** Starts a completely new, independent live greeting card project. */
  onNewProject: () => void;
}) {
  const { t, lang } = useI18n();
  const start = useServerFn(startLiveCardAnimation);
  const refresh = useServerFn(refreshLiveCardAnimation);
  const regenerate = useServerFn(regenerateLiveCardAnimation);
  const readProject = useServerFn(getLiveCardAnimationProject);
  const { balance } = useCreditBalance();
  const refreshBalance = useRefreshCreditBalance();
  const projectSpend = useLiveCardProjectSpend(sessionId ?? null);

  const [motion, setMotion] = useState("");
  const [duration, setDuration] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [animation, setAnimation] = useState<LiveCardAnimation | null>(null);
  // Attempts the person has dismissed with "try again" — never restored again.
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  // The greeting text is written after the animation is finished.
  const [textStage, setTextStage] = useState(true);

  // The motion description survives reloads and failed attempts, always bound
  // to the project it belongs to — another project never inherits it.
  const draftReady = useRef(false);
  useEffect(() => {
    draftReady.current = false;
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      const parsed = raw ? (JSON.parse(raw) as { sessionId?: string | null; text?: string }) : null;
      if (parsed?.text && (parsed.sessionId ?? null) === (sessionId ?? null)) setMotion(parsed.text);
    } catch {
      /* nothing stored */
    }
    draftReady.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);
  useEffect(() => {
    if (!draftReady.current) return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ sessionId, text: motion }));
    } catch {
      /* nothing to store */
    }
  }, [motion, sessionId]);

  const options = useQuery({
    queryKey: ["live-cards", "animation-options"],
    queryFn: () => getAnimationOptions(),
  });

  // The project itself decides the length and the remaining regenerations —
  // the browser only displays what the server already enforces.
  const project = useQuery({
    queryKey: ["live-cards", "animation-project", card.id],
    queryFn: () => readProject({ data: { cardId: card.id } }),
  });
  const lockedDuration = project.data?.lockedDuration ?? null;
  const regenerationsLeft = project.data?.regenerationsLeft ?? 0;
  const canRegenerate = project.data?.canRegenerate ?? false;
  // Fallback list kept for reference; the slider itself defines the range.
  const durations = options.data?.durations?.length
    ? options.data.durations
    : ([...PLANNED_VIDEO_DURATIONS] as number[]);
  void durations;
  const chosenDuration = normaliseAnimationDuration(lockedDuration ?? duration ?? ANIMATION_DURATION_DEFAULT);
  const priceCredits = animationDurationCredits(chosenDuration);
  const balanceAfter = balance - priceCredits;
  const canAfford = balance >= priceCredits;

  // Generation runs in the background: whatever is unfinished for this session
  // is picked up again when the person returns to the page.
  const existing = useQuery({
    queryKey: ["live-cards", "animations", sessionId],
    queryFn: () => listLiveCardAnimations({ data: { sessionId: sessionId ?? undefined } }),
    enabled: Boolean(sessionId),
  });
  useEffect(() => {
    if (animation || !existing.data?.length) return;
    const forCard = existing.data.filter((a) => a.sourceCardId === card.id && !dismissed.includes(a.id));
    // A finished animation always wins over an older failed technical attempt.
    const mine =
      forCard.find((a) => a.status === "ready") ??
      forCard.find((a) => isPending(a.status)) ??
      forCard[0];
    if (!mine) return;
    setAnimation(mine);
    onAnimation(mine);
    if (mine.prompt && !motion) setMotion(mine.prompt);
    setDuration(mine.durationSeconds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing.data, card.id, dismissed]);

  // Progress polling — the engine works asynchronously.
  useEffect(() => {
    if (!animation || !isPending(animation.status)) return;
    const id = window.setInterval(async () => {
      try {
        const result = await refresh({ data: { animationId: animation.id } });
        if (!result.ok) return;
        setAnimation(result.animation);
        onAnimation(result.animation);
        if (result.animation.status === "ready") {
          toast.success(t("la_ready_toast"));
          void project.refetch();
          void existing.refetch();
        }
        if (result.animation.status === "failed") toast.error(t("la_failed_toast"));
      } catch {
        /* transient — the next tick tries again */
      }
    }, 5000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animation?.id, animation?.status]);

  const statusLabel = useMemo(() => {
    if (!animation) return null;
    return t(`la_status_${animation.status}`);
  }, [animation, t]);

  async function animate() {
    if (motion.trim().length < 3) return;
    if (!canAfford) {
      toast.error(t("la_insufficient"));
      return;
    }
    setSending(true);
    try {
      const result = await start({
        data: {
          cardId: card.id,
          prompt: motion,
          promptLang: lang,
          durationSeconds: chosenDuration,
          sessionId: sessionId ?? undefined,
        },
      });
      if (!result.ok) {
        toast.error(
          result.errorCode === "no_generator"
            ? t("la_unavailable")
            : result.errorCode === "insufficient_credits" || result.errorCode === "charge_failed"
              ? t("la_insufficient")
              : t("la_failed_toast"),
        );
        refreshBalance();
        void projectSpend.refresh();
        return;
      }
      setAnimation(result.animation);
      onAnimation(result.animation);
      refreshBalance();
      void projectSpend.refresh();
    } catch {
      toast.error(t("la_failed_toast"));
    } finally {
      setSending(false);
    }
  }

  /**
   * One more animation of the same picture, with the same length. The previous
   * result stays untouched until the new one has really been produced.
   */
  async function runRegenerate() {
    if (regenerating || motion.trim().length < 3) return;
    if (!canRegenerate) return;
    if (balance < ANIMATION_REGENERATE_CREDITS) {
      toast.error(t("la_insufficient"));
      return;
    }
    setRegenerating(true);
    try {
      const result = await regenerate({
        data: {
          cardId: card.id,
          prompt: motion,
          promptLang: lang,
          sessionId: sessionId ?? undefined,
        },
      });
      if (!result.ok) {
        toast.error(
          result.errorCode === "regeneration_limit"
            ? t("la_regen_limit")
            : result.errorCode === "insufficient_credits" || result.errorCode === "charge_failed"
              ? t("la_insufficient")
              : t("la_failed_toast"),
        );
        refreshBalance();
        void projectSpend.refresh();
        void project.refetch();
        return;
      }
      setAnimation(result.animation);
      onAnimation(result.animation);
      refreshBalance();
      void projectSpend.refresh();
      void project.refetch();
      void existing.refetch();
    } catch {
      toast.error(t("la_failed_toast"));
    } finally {
      setRegenerating(false);
    }
  }

  const variants = (existing.data ?? []).filter(
    (a) => a.sourceCardId === card.id && a.status === "ready",
  );

  const running = Boolean(animation && isPending(animation.status));
  // Once the animation exists, the session is finished: every control that
  // could start the same animation again is removed from the page.
  const finished = animation?.status === "ready";

  if (finished && animation) {
    if (textStage) {
      return (
        <div className="space-y-4">
          {/* Animation variants of exactly this project ------------------- */}
          <div className="space-y-3 rounded-3xl border border-border/60 bg-card/70 p-4 shadow-warm sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 font-display text-sm font-semibold tracking-tight">
                <Film className="h-4 w-4 text-primary" />
                {t("la_variants")}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Lock className="h-3 w-3" />
                {t("la_duration")}: {animation.durationSeconds} {t("la_seconds_long")}
              </span>
            </div>

            {variants.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {variants.map((variant, index) => (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => {
                      setAnimation(variant);
                      onAnimation(variant);
                    }}
                    className={`shrink-0 overflow-hidden rounded-2xl border-2 transition ${
                      variant.id === animation.id
                        ? "border-primary shadow-warm"
                        : "border-border/60 hover:border-primary/50"
                    }`}
                  >
                    {variant.videoUrl ? (
                      <video
                        src={variant.videoUrl}
                        muted
                        loop
                        playsInline
                        onMouseEnter={(e) => void e.currentTarget.play().catch(() => undefined)}
                        onMouseLeave={(e) => e.currentTarget.pause()}
                        className="h-24 w-24 bg-black/5 object-cover"
                      />
                    ) : (
                      <span className="flex h-24 w-24 items-center justify-center text-xs">{index + 1}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

        <LiveGreetingTextStep
          key={animation.id}
          animationId={animation.id}
          videoUrl={animation.videoUrl}
          aspectRatio={animation.aspectRatio}
          onFinish={() => setTextStage(false)}
          belowSave={
            /* The one movement description of this card, and the paid
               regeneration that uses exactly its current content. */
            <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
              <label
                htmlFor="la-motion"
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                {t("la_motion_label")}
              </label>
              <textarea
                id="la-motion"
                value={motion}
                onChange={(e) => setMotion(e.target.value)}
                rows={2}
                maxLength={1000}
                placeholder={t("la_motion_ph")}
                className="w-full resize-none rounded-2xl border border-border/60 bg-background/70 p-3 text-sm leading-relaxed outline-none transition focus:border-primary/60"
              />
              {canRegenerate ? (
                <>
                  <button
                    type="button"
                    onClick={runRegenerate}
                    disabled={regenerating || motion.trim().length < 3 || balance < ANIMATION_REGENERATE_CREDITS}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border/60 px-6 py-3 text-sm font-semibold transition hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    {regenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    {t("la_regenerate")} — {ANIMATION_REGENERATE_CREDITS} {t("la_price_credits")}
                  </button>
                  <p className="text-xs text-muted-foreground">
                    {t("la_regen_left")} {regenerationsLeft}
                  </p>
                  {balance < ANIMATION_REGENERATE_CREDITS && (
                    <p className="text-xs font-medium text-destructive">{t("la_insufficient")}</p>
                  )}
                </>
              ) : (
                <p className="text-xs font-medium text-muted-foreground">{t("la_regen_limit")}</p>
              )}
            </div>
          }
          onNewProject={() => {
            window.localStorage.removeItem(DRAFT_KEY);
            setTextStage(true);
            setAnimation(null);
            setMotion("");
            setDuration(null);
            onAnimation(null);
            onNewProject();
          }}
        />
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-border/60 bg-card/70 p-6 text-center shadow-warm">
          <CheckCircle2 className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-3 font-display text-lg font-semibold tracking-tight">{t("la_done_title")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("la_done_hint")}</p>

          <div className="mt-5 flex flex-col gap-3">
            {animation.videoUrl && (
              <button
                type="button"
                onClick={() => setViewerOpen(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border/60 px-6 py-3 text-sm font-medium transition hover:border-primary/50"
              >
                <Play className="h-4 w-4" />
                {t("la_open_viewer")}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                window.localStorage.removeItem(DRAFT_KEY);
                setTextStage(true);
                setAnimation(null);
                setMotion("");
                setDuration(null);
                onAnimation(null);
                onNewProject();
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold-gradient px-6 py-3 text-sm font-semibold text-primary-foreground shadow-warm"
            >
              <Plus className="h-4 w-4" />
              {t("la_new_project")}
            </button>
          </div>
        </div>

        {viewerOpen && animation.videoUrl && (
          <LiveCardViewer
            videoUrl={animation.videoUrl}
            title={null}
            onClose={() => setViewerOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-start">
      {/* Chosen image — always visible while the movement is described ----- */}
      <div className="rounded-3xl border border-border/60 bg-card/70 p-3 shadow-warm sm:p-4 lg:sticky lg:top-24">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-1 pb-2">
          <span className="inline-flex min-w-0 items-center gap-2 font-display text-sm font-semibold tracking-tight">
            <Images className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">{t("la_step_image")}</span>
          </span>
          <button
            type="button"
            onClick={onChangeImage}
            disabled={running}
            className="shrink-0 rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium transition hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("la_change_image")}
          </button>
        </div>
        {card.imageUrl && (
          <img
            src={card.imageUrl}
            alt={card.prompt || t("la_step_image")}
            className="max-h-[58vh] w-full rounded-2xl bg-black/5 object-contain"
          />
        )}
      </div>

      {/* Controls ---------------------------------------------------------- */}
      <div className="min-w-0 space-y-4 rounded-3xl border border-border/60 bg-card/70 p-4 shadow-warm sm:p-5">
        <label htmlFor="la-motion" className="font-display text-base font-semibold tracking-tight">
          {t("la_motion_label")}
        </label>
        <textarea
          id="la-motion"
          value={motion}
          onChange={(e) => setMotion(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder={t("la_motion_ph")}
          className="mt-2 w-full resize-none rounded-2xl border border-border/60 bg-background/70 p-3 text-sm leading-relaxed outline-none transition focus:border-primary/60"
        />

        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("la_presets")}
        </p>
        <div className="-mt-2 flex flex-wrap gap-1.5">
          {MOTION_PRESET_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() =>
                setMotion((value) =>
                  value.trim() ? `${value.trim()} ${t(`la_preset_${key}_text`)}` : t(`la_preset_${key}_text`),
                )
              }
              className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
            >
              <Sparkles className="h-3 w-3" />
              {t(`la_preset_${key}`)}
            </button>
          ))}
        </div>

        {/* Duration — chosen before the animation starts, locked afterwards -- */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="la-duration"
              className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
            >
              <Clock className="h-3.5 w-3.5" />
              {t("la_duration")}
            </label>
            <span className="font-display text-sm font-semibold tracking-tight text-primary">
              {chosenDuration} {t("la_seconds_long")}
            </span>
          </div>
          {lockedDuration !== null ? (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Lock className="h-3 w-3" />
              {t("la_duration_locked")}
            </p>
          ) : (
          <>
          <input
            id="la-duration"
            type="range"
            min={0}
            max={ANIMATION_DURATIONS.length - 1}
            step={1}
            value={Math.max(0, ANIMATION_DURATIONS.indexOf(chosenDuration))}
            disabled={sending || running}
            onChange={(e) => setDuration(ANIMATION_DURATIONS[Number(e.target.value)])}
            className="mt-3 w-full accent-primary disabled:cursor-not-allowed disabled:opacity-50"
          />
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
            {ANIMATION_DURATIONS.map((seconds) => (
              <button
                key={seconds}
                type="button"
                disabled={sending || running}
                onClick={() => setDuration(seconds)}
                className={`rounded-full px-2 py-0.5 transition ${
                  chosenDuration === seconds ? "font-semibold text-primary" : "hover:text-foreground"
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {seconds}
                {t("la_seconds")}
              </button>
            ))}
          </div>
          </>
          )}
        </div>

        {/* Credits — everything the person pays, always up to date --------- */}
        <dl className="rounded-2xl border border-border/60 bg-background/60 px-3 py-2 text-xs">
          <SummaryRow label={t("la_balance_now")} value={`${balance} ${t("la_price_credits")}`} />
          <SummaryRow
            label={t("lc_spent")}
            value={`${projectSpend.spent} ${t("la_price_credits")}`}
          />
          <SummaryRow label={t("la_summary_duration")} value={`${chosenDuration}${t("la_seconds")}`} />
          <SummaryRow label={t("la_cost")} value={`${priceCredits} ${t("la_price_credits")}`} />
          <SummaryRow
            label={t("la_balance_after")}
            value={`${Math.max(0, balanceAfter)} ${t("la_price_credits")}`}
          />
          <SummaryRow label={t("la_summary_format")} value={card.aspectRatio ?? "1:1"} />
        </dl>
        {!canAfford && <p className="text-xs font-medium text-destructive">{t("la_insufficient")}</p>}

        <button
          type="button"
          onClick={animate}
          disabled={sending || running || motion.trim().length < 3 || !canAfford}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold-gradient px-6 py-3 text-sm font-semibold text-primary-foreground shadow-warm transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending || running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {sending ? t("la_animate_working") : t("la_animate")}
        </button>

        {animation && (
          <div className="rounded-2xl border border-border/60 bg-background/60 p-3">
            <p className="inline-flex items-center gap-2 text-sm font-medium">
              {running ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Film className="h-4 w-4 text-primary" />
              )}
              {statusLabel}
            </p>
            {running && <p className="mt-2 text-xs text-muted-foreground">{t("la_leave_hint")}</p>}
            {animation.status === "failed" && (
              <button
                type="button"
                onClick={() => {
                  setDismissed((ids) => [...ids, animation.id]);
                  setAnimation(null);
                  onAnimation(null);
                }}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-xs font-medium transition hover:border-primary/50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {t("la_retry")}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-0.5">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
