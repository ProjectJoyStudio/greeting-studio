import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Plus, Save, Sparkles, Type } from "lucide-react";
import { toast } from "sonner";

import { TextStylePanel } from "@/components/greeting-card/TextStylePanel";
import { LiveVideoPreview } from "./LiveVideoPreview";
import { composeGreetingFromKeywords } from "@/lib/greeting-card/cards.functions";
import { DEFAULT_TEXT_DESIGN, type CardTextDesign, type GreetingMode } from "@/lib/greeting-card/types";
import { saveLiveGreetingText } from "@/lib/live-cards/library.functions";
import { useI18n } from "@/lib/i18n";

/**
 * Final step of a live greeting card: the greeting text. It uses exactly the
 * same editor, modes and styling controls as the Greeting Cards module, so the
 * experience is identical across the platform.
 */
export function LiveGreetingTextStep({
  animationId,
  videoUrl,
  onFinish,
  onNewProject,
}: {
  animationId: string;
  videoUrl: string | null;
  onFinish: () => void;
  onNewProject: () => void;
}) {
  const { t, lang } = useI18n();
  const save = useServerFn(saveLiveGreetingText);
  const compose = useServerFn(composeGreetingFromKeywords);

  const [mode, setMode] = useState<GreetingMode>("manual");
  const [text, setText] = useState("");
  const [keywords, setKeywords] = useState("");
  const [title, setTitle] = useState("");
  const [design, setDesign] = useState<CardTextDesign>({ ...DEFAULT_TEXT_DESIGN });
  const [composing, setComposing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function generateText() {
    const list = keywords.split(",").map((k) => k.trim()).filter(Boolean);
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
      setText(result.text);
    } catch {
      toast.error(t("lgt_compose_failed"));
    } finally {
      setComposing(false);
    }
  }

  async function persist(finish: boolean) {
    setSaving(true);
    try {
      await save({
        data: {
          animationId,
          title,
          greetingText: text,
          greetingMode: mode,
          keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
          textDesign: design as unknown as Record<string, unknown>,
        },
      });
      setSaved(true);
      toast.success(t("lgt_saved"));
      if (finish) onFinish();
    } catch {
      toast.error(t("lgt_save_failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-warm">
        <span className="inline-flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <Type className="h-4 w-4 text-primary" />
          {t("lgt_title")}
        </span>
        <p className="mt-2 text-sm text-muted-foreground">{t("lgt_hint")}</p>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1.05fr_1fr]">
          {/* Live preview — the greeting can be dragged into place ---------- */}
          <div>
            <LiveVideoPreview
              videoUrl={videoUrl}
              text={text}
              design={design}
              onMove={(pos) => setDesign((d) => ({ ...d, ...pos }))}
            />
            <p className="mt-2 text-xs text-muted-foreground">{t("lgt_drag_hint")}</p>
          </div>

          <div className="space-y-4">
            <div className="flex gap-2">
              {(["manual", "keywords"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 rounded-full border px-4 py-2 text-xs font-medium transition ${
                    mode === m
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {t(m === "manual" ? "lgt_mode_manual" : "lgt_mode_keywords")}
                </button>
              ))}
            </div>

            {mode === "keywords" && (
              <div className="space-y-2">
                <input
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
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
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder={t("lgt_text_ph")}
              className="w-full resize-none rounded-2xl border border-border/60 bg-background/70 p-4 text-sm leading-relaxed outline-none transition focus:border-primary/60"
            />

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("lgt_name_ph")}
              className="w-full rounded-xl border border-border/60 bg-background/70 px-4 py-2.5 text-sm outline-none transition focus:border-primary/60"
            />

            <TextStylePanel design={design} onChange={(patch) => setDesign((d) => ({ ...d, ...patch }))} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => persist(true)}
          disabled={saving}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gold-gradient px-6 py-3 text-sm font-semibold text-primary-foreground shadow-warm disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("lgt_save")}
        </button>
        <button
          type="button"
          onClick={onFinish}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-border/60 px-6 py-3 text-sm font-medium transition hover:border-primary/50"
        >
          <CheckCircle2 className="h-4 w-4" />
          {t("lgt_skip")}
        </button>
        <button
          type="button"
          onClick={onNewProject}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border/60 px-6 py-3 text-sm font-medium transition hover:bg-secondary"
        >
          <Plus className="h-4 w-4" />
          {t("la_new_project")}
        </button>
      </div>
      {saved && <p className="text-center text-xs text-muted-foreground">{t("lgt_saved")}</p>}
    </div>
  );
}
