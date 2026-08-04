import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Clock,
  Coins,
  Film,
  Loader2,
  Music,
  PenLine,
  Sliders,
  Sparkles,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { useI18n } from "@/lib/i18n";
import { useCreditBalance } from "@/lib/credits/useCreditBalance";
import { creditWord } from "@/lib/credits/i18n";
import { openPvgProject } from "@/lib/personal-video/pvg.functions";
import { claimPvgEditSession } from "@/lib/personal-video/order.functions";
import { SaveIndicator } from "@/components/personal-video/SaveIndicator";
import { VoicePanel } from "@/components/personal-video/VoicePanel";
import type { SaveState } from "@/lib/personal-video/order";
import { composePvgGreeting, savePvgVideoSetup } from "@/lib/personal-video/video-setup.functions";
import {
  PVS_MAX_SECONDS,
  PVS_MIN_SECONDS,
  PVS_STEP_SECONDS,
  clampDuration,
  costSummary,
  greetingFit,
  type PvsGreetingMode,
} from "@/lib/personal-video/video-setup";

const LANG_NAMES: Record<string, string> = {
  en: "English",
  ru: "Russian",
  de: "German",
  uk: "Ukrainian",
  fr: "French",
  pl: "Polish",
};

export function VideoSetupPage({ projectId }: { projectId?: string | undefined }) {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { balance, isTest } = useCreditBalance();
  const open = useServerFn(openPvgProject);
  const saveSetup = useServerFn(savePvgVideoSetup);
  const compose = useServerFn(composePvgGreeting);
  const claim = useServerFn(claimPvgEditSession);

  const query = useQuery({
    queryKey: ["pvg", "setup", projectId ?? "new"],
    queryFn: () => open({ data: { projectId } }),
    enabled: Boolean(projectId),
  });
  const project = query.data?.project ?? null;

  const [duration, setDuration] = useState(15);
  const [mode, setMode] = useState<PvsGreetingMode>("manual");
  const [greeting, setGreeting] = useState("");
  const [keywords, setKeywords] = useState("");
  const [working, setWorking] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [readOnly, setReadOnly] = useState(false);
  const loaded = useRef(false);
  const sessionId = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : String(Math.random()),
  );

  // One writer at a time: another open device is told instead of overwritten.
  useEffect(() => {
    if (!project) return;
    let stop = false;
    const beat = () =>
      void claim({ data: { projectId: project.id, sessionId: sessionId.current } })
        .then((res) => {
          if (!stop) setReadOnly(!res.editable);
        })
        .catch(() => undefined);
    beat();
    const timer = setInterval(beat, 30_000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [project, claim]);

  useEffect(() => {
    if (!project || loaded.current) return;
    loaded.current = true;
    setDuration(clampDuration(project.videoSetup.durationSeconds));
    setMode(project.videoSetup.greetingMode);
    setGreeting(project.videoSetup.greetingText);
    setKeywords(project.videoSetup.greetingKeywords);
  }, [project]);

  // Everything the person changes is stored quietly in their draft.
  const persist = useCallback(() => {
    if (!project || readOnly) return;
    setSaveState("saving");
    void saveSetup({
      data: {
        projectId: project.id,
        durationSeconds: duration,
        greetingMode: mode,
        greetingText: greeting,
        greetingKeywords: keywords,
      },
    })
      .then(() => setSaveState("saved"))
      .catch(() => setSaveState("failed"));
  }, [project, readOnly, duration, mode, greeting, keywords, saveSetup]);

  useEffect(() => {
    if (!project || !loaded.current) return;
    const id = setTimeout(persist, 1200);
    return () => clearTimeout(id);
  }, [persist, project]);

  // Leaving the page, switching tab or closing the browser saves first.
  useEffect(() => {
    const flush = () => persist();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
      flush();
    };
  }, [persist]);

  const scene = useMemo(
    () =>
      project?.scenes.find((s) => s.id === project.selectedSceneId) ??
      project?.scenes.find((s) => s.status === "ready") ??
      null,
    [project],
  );

  const fit = greetingFit(greeting, duration);
  const cost = costSummary(project?.creditsCharged ?? 0, duration, balance);
  const word = creditWord(lang, isTest, t("pvg_credits_word"));

  async function runCompose(task: "compose" | "shorten" | "expand") {
    if (!project || working) return;
    setWorking(task);
    try {
      const res = await compose({
        data: {
          task,
          text: task === "compose" ? "" : greeting,
          keywords,
          recipientName: project.recipientName,
          occasion: project.occasion,
          durationSeconds: duration,
          language: LANG_NAMES[lang] ?? "English",
        },
      });
      setGreeting(res.text);
      toast.success(t("pvs_saved"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setWorking(null);
    }
  }

  return (
    <SiteLayout>
      <PageHeader title={t("pvs_title")} subtitle={t("pvs_sub")} />

      <div className="mx-auto flex w-full max-w-7xl items-center justify-end gap-3 px-4 lg:px-6">
        {readOnly && <span className="text-xs text-destructive">{t("pvo_readonly")}</span>}
        <SaveIndicator state={saveState} onRetry={persist} />
      </div>

      <section className="mx-auto w-full max-w-7xl px-4 pb-24 lg:px-6">
        <button
          type="button"
          onClick={() =>
            navigate({ to: "/video-greeting", search: project ? { project: project.id } : {} })
          }
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-xs font-medium transition hover:border-primary/50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("pvs_back")}
        </button>

        {query.isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {t("pvs_loading")}
          </p>
        ) : !project ? (
          <p className="rounded-2xl border border-dashed border-border/70 bg-card/50 p-10 text-center text-sm text-muted-foreground">
            {t("pvs_no_scene")}
          </p>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,7fr)_minmax(0,6fr)]">
            {/* LEFT — every tool of the future video ---------------------- */}
            <div className="space-y-6">
              {/* Duration */}
              <Panel icon={<Clock className="h-4 w-4" />} title={t("pvs_duration")}>
                <div className="flex items-baseline justify-between gap-4">
                  <p className="font-display text-3xl font-semibold tracking-tight">
                    {duration}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      {t("pvs_seconds")}
                    </span>
                  </p>
                  <p className="text-sm font-medium text-primary">
                    {cost.video} {word}
                  </p>
                </div>
                <input
                  type="range"
                  min={PVS_MIN_SECONDS}
                  max={PVS_MAX_SECONDS}
                  step={PVS_STEP_SECONDS}
                  value={duration}
                  onChange={(e) => setDuration(clampDuration(e.target.value))}
                  className="mt-4 w-full accent-primary"
                  aria-label={t("pvs_duration")}
                />
                <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                  <span>{PVS_MIN_SECONDS}s</span>
                  <span>{t("pvs_duration_hint")}</span>
                  <span>{PVS_MAX_SECONDS}s</span>
                </div>
              </Panel>

              {/* Greeting */}
              <Panel icon={<PenLine className="h-4 w-4" />} title={t("pvs_greeting")}>
                <div className="flex flex-wrap gap-2">
                  {(["manual", "keywords"] as PvsGreetingMode[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                        mode === m
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/60 hover:border-primary/40"
                      }`}
                    >
                      {m === "manual" ? t("pvs_mode_manual") : t("pvs_mode_keywords")}
                    </button>
                  ))}
                </div>

                {mode === "keywords" && (
                  <div className="mt-4 space-y-3">
                    <textarea
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      placeholder={t("pvs_keywords_ph")}
                      rows={3}
                      className="w-full rounded-2xl border border-border/60 bg-background/70 p-4 text-sm outline-none transition focus:border-primary/60"
                    />
                    <button
                      type="button"
                      disabled={working !== null || keywords.trim().length < 3}
                      onClick={() => void runCompose("compose")}
                      className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-warm disabled:opacity-60"
                    >
                      {working === "compose" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      {working === "compose" ? t("pvs_working") : t("pvs_generate_greeting")}
                    </button>
                  </div>
                )}

                <textarea
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  placeholder={t("pvs_greeting_ph")}
                  rows={7}
                  className="mt-4 w-full rounded-2xl border border-border/60 bg-background/70 p-4 text-sm leading-relaxed outline-none transition focus:border-primary/60"
                />
              </Panel>

              {/* Automatic fit */}
              <Panel icon={<Wand2 className="h-4 w-4" />} title={t("pvs_fit_title")}>
                <p
                  className={`text-sm ${
                    fit.state === "ok"
                      ? "text-primary"
                      : fit.state === "empty"
                        ? "text-muted-foreground"
                        : "text-destructive"
                  }`}
                >
                  {fit.state === "ok"
                    ? t("pvs_fit_ok")
                    : fit.state === "long"
                      ? t("pvs_fit_long")
                      : fit.state === "short"
                        ? t("pvs_fit_short")
                        : t("pvs_fit_empty")}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {fit.words} {t("pvs_words")} · {t("pvs_target")}: {fit.min}–{fit.max} ·{" "}
                  {t("pvs_spoken")}: {fit.spokenSeconds}s
                </p>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${
                      fit.state === "ok" ? "bg-primary" : "bg-destructive/70"
                    }`}
                    style={{ width: `${Math.min(100, (fit.words / Math.max(1, fit.max)) * 100)}%` }}
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={working !== null || fit.state !== "long"}
                    onClick={() => void runCompose("shorten")}
                    className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-xs font-medium transition hover:border-primary/50 disabled:opacity-50"
                  >
                    {working === "shorten" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {t("pvs_shorten")}
                  </button>
                  <button
                    type="button"
                    disabled={working !== null || fit.state !== "short"}
                    onClick={() => void runCompose("expand")}
                    className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-xs font-medium transition hover:border-primary/50 disabled:opacity-50"
                  >
                    {working === "expand" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {t("pvs_expand")}
                  </button>
                </div>
              </Panel>

              {/* Voice of the greeting */}
              <VoicePanel
                projectId={project.id}
                people={project.people}
                greeting={greeting}
                language={lang}
                videoSeconds={duration}
                disabled={readOnly}
                speechMode={project.speechMode}
                syncMode={project.syncMode}
                chorusVoiceIds={project.chorusVoiceIds}
                onAssigned={() => void query.refetch()}
              />

              {/* Reserved: music */}
              <ReservedPanel
                icon={<Music className="h-4 w-4" />}
                title={t("pvs_music")}
                soon={t("pvs_soon")}
                options={[t("pvs_music_library"), t("pvs_music_upload")]}
              />

              {/* Reserved: audio levels */}
              <Panel
                icon={<Sliders className="h-4 w-4" />}
                title={t("pvs_audio")}
                soon={t("pvs_soon")}
              >
                <div className="space-y-4 opacity-60">
                  {[t("pvs_voice_volume"), t("pvs_music_volume")].map((label) => (
                    <div key={label}>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        defaultValue={70}
                        disabled
                        aria-label={label}
                        className="w-full accent-primary"
                      />
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            {/* RIGHT — the approved picture and the live cost -------------- */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <div className="rounded-3xl border border-border/60 bg-card/70 p-4 shadow-warm">
                <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Film className="h-3.5 w-3.5" />
                  {t("pvs_preview_title")}
                </p>
                {scene?.imageUrl ? (
                  <img
                    src={scene.imageUrl}
                    alt={project.recipientName || t("pvs_preview_title")}
                    className="w-full select-none rounded-2xl object-contain"
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-dashed border-border/60 text-xs text-muted-foreground">
                    {t("pvs_no_scene")}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{project.recipientName || "—"}</span>
                  <span>{project.occasion || "—"}</span>
                  <span>
                    {duration} {t("pvs_seconds")}
                  </span>
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-border/60 bg-card/70 p-5 shadow-warm">
                <p className="flex items-center gap-2 font-display text-base font-semibold">
                  <Coins className="h-4 w-4 text-primary" />
                  {t("pvs_cost_title")}
                </p>
                <dl className="mt-4 space-y-2 text-sm">
                  <Row label={t("pvs_cost_spent")} value={`${cost.alreadySpent} ${word}`} />
                  <Row label={t("pvs_cost_video")} value={`${cost.video} ${word}`} />
                  <Row label={t("pvs_cost_voice")} value={`+${cost.voice} ${word}`} />
                  <Row label={t("pvs_cost_music")} value={t("pvs_cost_included")} />
                  <div className="my-2 h-px bg-border/60" />
                  <Row label={t("pvs_cost_total")} value={`${cost.total} ${word}`} strong />
                  <Row label={t("pvs_cost_remaining")} value={`${cost.remaining} ${word}`} />
                </dl>
                <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                  {t("pvs_no_charge_note")}
                </p>

                <button
                  type="button"
                  disabled
                  className="mt-6 w-full rounded-full bg-gold-gradient px-6 py-4 text-base font-semibold text-primary-foreground shadow-warm disabled:opacity-60"
                >
                  {t("pvs_create_video")}
                </button>
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  {t("pvs_create_note")}
                </p>
                <Link
                  to="/dashboard/video-greetings"
                  className="mt-4 block text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
                >
                  {t("pvg_drafts_title")}
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>
    </SiteLayout>
  );
}

function Panel({
  icon,
  title,
  soon,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  soon?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-warm">
      <p className="mb-4 flex items-center gap-2 font-display text-base font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
        {soon && (
          <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {soon}
          </span>
        )}
      </p>
      {children}
    </div>
  );
}

function ReservedPanel({
  icon,
  title,
  soon,
  options,
}: {
  icon: React.ReactNode;
  title: string;
  soon: string;
  options: string[];
}) {
  return (
    <Panel icon={icon} title={title} soon={soon}>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            disabled
            className="cursor-not-allowed rounded-2xl border border-dashed border-border/60 px-4 py-3 text-left text-xs font-medium text-muted-foreground opacity-70"
          >
            {option}
          </button>
        ))}
      </div>
    </Panel>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-display text-base font-semibold text-primary" : "font-medium"}>
        {value}
      </dd>
    </div>
  );
}
