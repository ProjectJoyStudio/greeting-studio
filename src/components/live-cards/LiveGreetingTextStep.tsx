import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Check,
  CheckCircle2,
  Cloud,
  Loader2,
  Plus,
  Send,
  Sparkles,
  Type,
} from "lucide-react";
import { toast } from "sonner";

import { TextStylePanel } from "@/components/greeting-card/TextStylePanel";
import { LiveVideoPreview } from "./LiveVideoPreview";
import { LiveCardViewer } from "./LiveCardViewer";
import { composeGreetingFromKeywords } from "@/lib/greeting-card/cards.functions";
import {
  DEFAULT_TEXT_DESIGN,
  normalizeTextDesign,
  type CardTextDesign,
  type GreetingMode,
} from "@/lib/greeting-card/types";
import {
  getLiveGreetingDraft,
  finalizeLiveGreeting,
  saveLiveGreetingText,
} from "@/lib/live-cards/library.functions";
import { renderFinalVideo, uploadFinalVideo } from "@/lib/live-cards/burn";
import { clampPosition } from "@/lib/live-cards/text-render";
import { useI18n } from "@/lib/i18n";

const RATIO_CLASS: Record<string, string> = {
  "1:1": "aspect-square",
  "4:5": "aspect-[4/5]",
  "9:16": "aspect-[9/16]",
  "16:9": "aspect-video",
};

type EditorState = {
  mode: GreetingMode;
  text: string;
  keywords: string;
  title: string;
  design: CardTextDesign;
};

const EMPTY: EditorState = {
  mode: "manual",
  text: "",
  keywords: "",
  title: "",
  design: { ...DEFAULT_TEXT_DESIGN },
};

/**
 * The final editing step of a live greeting card: a large video editor where
 * the greeting is placed directly on the animation. Everything is kept as a
 * draft while editing; saving renders one new video file with the greeting
 * permanently part of every frame.
 */
export function LiveGreetingEditor({
  animationId,
  videoUrl,
  aspectRatio,
  onFinish,
  onNewProject,
}: {
  animationId: string;
  videoUrl: string | null;
  aspectRatio?: string | null;
  onFinish?: () => void;
  onNewProject?: () => void;
}) {
  const { t, lang } = useI18n();
  const save = useServerFn(saveLiveGreetingText);
  const finalize = useServerFn(finalizeLiveGreeting);
  const loadDraft = useServerFn(getLiveGreetingDraft);
  const compose = useServerFn(composeGreetingFromKeywords);

  const [state, setState] = useState<EditorState>(EMPTY);
  const [ready, setReady] = useState(false);
  const [composing, setComposing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [finalUrl, setFinalUrl] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const dirty = useRef(false);

  const patch = useCallback((next: Partial<EditorState>) => {
    dirty.current = true;
    setState((s) => ({ ...s, ...next }));
  }, []);
  const patchDesign = useCallback((next: Partial<CardTextDesign>) => {
    dirty.current = true;
    setState((s) => ({ ...s, design: { ...s.design, ...next } }));
  }, []);

  // ---- Draft recovery ----------------------------------------------------
  // The stored draft in the personal account is the only source of truth.
  useEffect(() => {
    let cancelled = false;
    setState(EMPTY);
    dirty.current = false;
    (async () => {
      try {
        const draft = await loadDraft({ data: { animationId } });
        if (cancelled || !draft) return;
        if (!dirty.current) {
          setState({
            mode: draft.greetingMode,
            text: draft.greetingText,
            keywords: draft.greetingKeywords.join(", "),
            title: draft.title ?? "",
            design: normalizeTextDesign(draft.textDesign),
          });
        }
        if (draft.isFinalized && draft.videoUrl) setFinalUrl(draft.videoUrl);
      } catch {
        /* the browser copy keeps the person working */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationId]);

  // ---- Automatic draft saving -------------------------------------------
  useEffect(() => {
    if (!ready || !dirty.current) return;
    const timer = window.setTimeout(async () => {
      setSavingDraft(true);
      try {
        await save({
          data: {
            animationId,
            title: state.title,
            greetingText: state.text,
            greetingMode: state.mode,
            keywords: state.keywords.split(",").map((k) => k.trim()).filter(Boolean),
            textDesign: state.design as unknown as Record<string, unknown>,
          },
        });
      } catch {
        /* the next change tries again */
      } finally {
        setSavingDraft(false);
      }
    }, 800);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, ready, animationId]);

  async function generateText() {
    const list = state.keywords.split(",").map((k) => k.trim()).filter(Boolean);
    if (!list.length) {
      toast.error(t("lgt_keywords_required"));
      return;
    }
    setComposing(true);
    try {
      const result = await compose({ data: { keywords: list, language: lang } });
      if (!result.ok || !result.text) {
        toast.error(t("lgt_compose_failed"));
        return;
      }
      patch({ text: result.text });
    } catch {
      toast.error(t("lgt_compose_failed"));
    } finally {
      setComposing(false);
    }
  }

  /** Renders the finished file and stores it as the completed version. */
  async function complete() {
    if (!videoUrl) return;
    setRendering(true);
    setProgress(0);
    try {
      const text = state.text;
      const rendered = await renderFinalVideo(videoUrl, text, state.design, setProgress);
      if (text.trim() && !rendered.verified) {
        toast.error(t("lge_verify_failed"));
        return;
      }
      const path = await uploadFinalVideo(
        animationId,
        rendered.blob,
        rendered.extension,
        rendered.mime,
      );
      const result = await finalize({
        data: {
          animationId,
          storagePath: path,
          mime: rendered.mime,
          hasText: Boolean(text.trim()),
          title: state.title,
        },
      });
      setFinalUrl(result.videoUrl);
      toast.success(t("lge_completed"));
      onFinish?.();
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      toast.error(code === "recording_unsupported" ? t("lge_unsupported") : t("lge_render_failed"));
    } finally {
      setRendering(false);
    }
  }

  const ratioClass = useMemo(() => RATIO_CLASS[aspectRatio ?? ""] ?? "aspect-video", [aspectRatio]);

  // ---- Completed ---------------------------------------------------------
  if (finalUrl) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-border/60 bg-card/70 p-6 text-center shadow-warm">
          <CheckCircle2 className="mx-auto h-9 w-9 text-primary" />
          <h2 className="mt-3 font-display text-xl font-semibold tracking-tight">
            {t("lge_done_title")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("lge_done_hint")}</p>
          <video
            src={finalUrl}
            controls
            loop
            playsInline
            className={`mx-auto mt-5 w-full max-w-2xl rounded-2xl bg-black ${ratioClass} object-contain`}
          />
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => setViewerOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gold-gradient px-6 py-3 text-sm font-semibold text-primary-foreground shadow-warm"
            >
              <Send className="h-4 w-4" />
              {t("la_open_viewer")}
            </button>
            {onNewProject && (
              <button
                type="button"
                onClick={onNewProject}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-border/60 px-6 py-3 text-sm font-medium transition hover:bg-secondary"
              >
                <Plus className="h-4 w-4" />
                {t("la_new_project")}
              </button>
            )}
          </div>
        </div>
        {viewerOpen && (
          <LiveCardViewer
            videoUrl={finalUrl}
            title={state.title || null}
            onClose={() => setViewerOpen(false)}
          />
        )}
      </div>
    );
  }

  // ---- Editor ------------------------------------------------------------
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* Stage — the video stays the centre of the page ------------------ */}
        <div className="rounded-3xl border border-border/60 bg-card/70 p-3 shadow-warm sm:p-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-1 pb-3">
            <span className="inline-flex min-w-0 items-center gap-2 font-display text-base font-semibold tracking-tight sm:text-lg">
              <Type className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{t("lge_title")}</span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
              {savingDraft ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Cloud className="h-3.5 w-3.5 text-primary" />
              )}
              {savingDraft ? t("lge_saving") : t("lge_saved_auto")}
            </span>
          </div>

          <LiveVideoPreview
            videoUrl={videoUrl}
            text={state.text}
            design={state.design}
            showSafeArea
            ratioClass={ratioClass}
            className="mx-auto max-h-[62vh] w-full"
            onMove={(pos) => patchDesign(pos)}
          />
          <p className="mt-2 px-1 text-xs text-muted-foreground">{t("lge_drag_hint")}</p>
        </div>

        {/* Controls -------------------------------------------------------- */}
        <div className="space-y-4 rounded-3xl border border-border/60 bg-card/70 p-5 shadow-warm">
          <div className="flex gap-2">
            {(["manual", "keywords"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => patch({ mode: m })}
                className={`flex-1 rounded-full border px-4 py-2 text-xs font-medium transition ${
                  state.mode === m
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground hover:border-primary/40"
                }`}
              >
                {t(m === "manual" ? "lgt_mode_manual" : "lgt_mode_keywords")}
              </button>
            ))}
          </div>

          {state.mode === "keywords" && (
            <div className="space-y-2">
              <input
                value={state.keywords}
                onChange={(e) => patch({ keywords: e.target.value })}
                placeholder={t("lgt_keywords_ph")}
                className="w-full rounded-xl border border-border/60 bg-background/70 px-4 py-2.5 text-sm outline-none transition focus:border-primary/60"
              />
              <button
                type="button"
                onClick={generateText}
                disabled={composing}
                className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-xs font-medium transition hover:border-primary/50 disabled:opacity-60"
              >
                {composing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {t("lgt_compose")}
              </button>
            </div>
          )}

          <textarea
            value={state.text}
            onChange={(e) => patch({ text: e.target.value })}
            rows={4}
            maxLength={2000}
            placeholder={t("lgt_text_ph")}
            className="w-full resize-none rounded-2xl border border-border/60 bg-background/70 p-4 text-sm leading-relaxed outline-none transition focus:border-primary/60"
          />

          <input
            value={state.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder={t("lgt_name_ph")}
            className="w-full rounded-xl border border-border/60 bg-background/70 px-4 py-2.5 text-sm outline-none transition focus:border-primary/60"
          />

          <TextStylePanel
            design={state.design}
            onChange={(p) => {
              const merged = { ...state.design, ...p };
              patchDesign({ ...p, ...clampPosition(merged.x, merged.y, merged.width) });
            }}
          />
        </div>
      </div>

      {/* Final actions ------------------------------------------------------ */}
      <div className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-warm">
        {rendering && (
          <div className="mb-4">
            <p className="inline-flex items-center gap-2 text-sm font-medium">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              {t("lge_rendering")} — {Math.round(progress * 100)}%
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gold-gradient transition-all"
                style={{ width: `${Math.max(4, Math.round(progress * 100))}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t("lge_rendering_hint")}</p>
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => complete(true)}
            disabled={rendering || !videoUrl || !state.text.trim()}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gold-gradient px-6 py-3 text-sm font-semibold text-primary-foreground shadow-warm transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {rendering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {t("lge_save_final")}
          </button>
          <button
            type="button"
            onClick={() => complete(false)}
            disabled={rendering || !videoUrl}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-border/60 px-6 py-3 text-sm font-medium transition hover:border-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {t("lge_send_without_text")}
          </button>
          {onNewProject && (
            <button
              type="button"
              onClick={onNewProject}
              disabled={rendering}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border/60 px-6 py-3 text-sm font-medium transition hover:bg-secondary disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {t("la_new_project")}
            </button>
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t("lge_draft_note")}</p>
      </div>
    </div>
  );
}

/** Kept for the creation flow, which still calls the step by its old name. */
export const LiveGreetingTextStep = LiveGreetingEditor;
