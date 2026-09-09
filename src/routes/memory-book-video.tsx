import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { SiteLayout } from "@/components/site/SiteLayout";
import { PageHeader } from "@/components/site/PageHeader";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { MEMORY_BOOK_MATERIALS_BUCKET, type MemoryBookMaterial } from "@/lib/memory-book/materials";
import {
  MEMORY_BOOK_FINAL_VIDEO_MAX_SECONDS,
  MEMORY_BOOK_FRAGMENT_MIN_SECONDS,
  clampFragment,
  formatClock,
  fragmentsLength,
  type MemoryBookVideoFragment,
} from "@/lib/memory-book/video-prep";
import { joinVideoFragments } from "@/lib/memory-book/video-join";
import {
  loadMemoryBookVideoEdit,
  registerPreparedMemoryBookVideo,
  saveMemoryBookVideoFragments,
} from "@/lib/memory-book/video-prep.functions";

export const Route = createFileRoute("/memory-book-video")({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    book: string;
    material: string;
    from: "materials" | "pages";
    /** The exact internal page to return to, when the customer came from one. */
    page?: number;
  } => ({
    book: typeof search.book === "string" ? search.book : "",
    material: typeof search.material === "string" ? search.material : "",
    from: search.from === "pages" ? "pages" : "materials",
    page: Number(search.page) > 0 ? Number(search.page) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Prepare a video — Project Joy Memory Book" },
      {
        name: "description",
        content: "Choose the parts of a long video that belong in your Project Joy Memory Book.",
      },
      { property: "og:title", content: "Prepare a video — Project Joy Memory Book" },
      {
        property: "og:description",
        content: "Choose the parts of a long video that belong in your Project Joy Memory Book.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MemoryBookVideoPage,
});

function fill(text: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (out, [key, value]) => out.replaceAll(`{${key}}`, String(value)),
    text,
  );
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function MemoryBookVideoPage() {
  const { t } = useI18n();
  const { book: bookId, material: materialId, from, page } = Route.useSearch();
  const navigate = useNavigate();

  const loadEdit = useServerFn(loadMemoryBookVideoEdit);
  const saveFragments = useServerFn(saveMemoryBookVideoFragments);
  const registerPrepared = useServerFn(registerPreparedMemoryBookVideo);

  const player = useRef<HTMLVideoElement | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopAt = useRef<number | null>(null);

  const [state, setState] = useState<"loading" | "ready" | "denied">("loading");
  const [source, setSource] = useState<MemoryBookMaterial | null>(null);
  const [fragments, setFragments] = useState<MemoryBookVideoFragment[]>([]);
  const [sourceSeconds, setSourceSeconds] = useState(0);
  const [current, setCurrent] = useState(0);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ url: string; blob: Blob; extension: string; mime: string; seconds: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!bookId || !materialId) {
      setState("denied");
      return;
    }
    loadEdit({ data: { bookId, materialId } })
      .then((res) => {
        if (!alive) return;
        if (res.ok && res.source) {
          setSource(res.source);
          setFragments(res.fragments);
          setSourceSeconds(res.source.durationSeconds ?? 0);
          setState("ready");
        } else {
          setState("denied");
        }
      })
      .catch(() => {
        if (alive) setState("denied");
      });
    return () => {
      alive = false;
    };
  }, [bookId, materialId, loadEdit]);

  /** The chosen parts are stored automatically — there is no save button. */
  const persist = useCallback(
    (next: MemoryBookVideoFragment[]) => {
      setFragments(next);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void saveFragments({ data: { bookId, materialId, fragments: next } }).catch(
          () => undefined,
        );
      }, 600);
    },
    [bookId, materialId, saveFragments],
  );

  useEffect(() => () => (saveTimer.current ? clearTimeout(saveTimer.current) : undefined), []);

  const total = fragmentsLength(fragments);
  const overLimit = total > MEMORY_BOOK_FINAL_VIDEO_MAX_SECONDS;

  function addFragment() {
    const start = Math.min(current, Math.max(0, sourceSeconds - MEMORY_BOOK_FRAGMENT_MIN_SECONDS));
    const end = Math.min(sourceSeconds, start + 15);
    persist([...fragments, clampFragment({ id: newId(), start, end }, sourceSeconds)]);
  }

  function updateFragment(id: string, patch: Partial<MemoryBookVideoFragment>) {
    persist(
      fragments.map((fragment) =>
        fragment.id === id ? clampFragment({ ...fragment, ...patch }, sourceSeconds) : fragment,
      ),
    );
  }

  /** Moves one boundary by exactly one second, never past the 5 minute total. */
  function nudge(fragment: MemoryBookVideoFragment, edge: "start" | "end", delta: 1 | -1) {
    const value = fragment[edge] + delta;
    const others = total - (fragment.end - fragment.start);
    const room = MEMORY_BOOK_FINAL_VIDEO_MAX_SECONDS - others;
    const wanted =
      edge === "start"
        ? { start: Math.min(Math.max(0, value), fragment.end - MEMORY_BOOK_FRAGMENT_MIN_SECONDS) }
        : { end: Math.min(value, sourceSeconds, fragment.start + Math.max(0, room)) };
    if (edge === "start" && fragment.end - (wanted.start ?? 0) > room) {
      wanted.start = Math.max(wanted.start ?? 0, fragment.end - Math.max(0, room));
    }
    updateFragment(fragment.id, wanted);
  }

  function playFragment(fragment: MemoryBookVideoFragment) {
    const el = player.current;
    if (!el) return;
    stopAt.current = fragment.end;
    el.currentTime = fragment.start;
    void el.play();
  }

  async function runProcess() {
    if (!source || fragments.length === 0 || overLimit || working) return;
    setWorking(true);
    setMessage(null);
    setProgress(0);
    try {
      player.current?.pause();
      const prepared = await joinVideoFragments(source.url, fragments, (ratio) =>
        setProgress(Math.round(ratio * 100)),
      );
      if (prepared.seconds > MEMORY_BOOK_FINAL_VIDEO_MAX_SECONDS + 1) {
        setMessage(t("mbv_too_long"));
        return;
      }
      setResult({
        url: URL.createObjectURL(prepared.blob),
        blob: prepared.blob,
        extension: prepared.extension,
        mime: prepared.mime,
        seconds: prepared.seconds,
      });
    } catch {
      setMessage(t("mbv_failed"));
    } finally {
      setWorking(false);
    }
  }

  async function confirmResult() {
    if (!result || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const { data: session } = await supabase.auth.getUser();
      const userId = session.user?.id;
      if (!userId) throw new Error("no_user");
      const path = `${userId}/${bookId}/video-prepared-${Date.now()}.${result.extension}`;
      const { error: upErr } = await supabase.storage
        .from(MEMORY_BOOK_MATERIALS_BUCKET)
        .upload(path, result.blob, { upsert: false, contentType: result.mime });
      if (upErr) throw new Error("upload_failed");

      const res = await registerPrepared({
        data: {
          bookId,
          sourceMaterialId: materialId,
          path,
          fileName: `${source?.fileName ?? "video"} (${formatClock(result.seconds)})`,
          mimeType: result.mime,
          sizeBytes: result.blob.size,
          durationSeconds: result.seconds,
        },
      });
      if (!res.ok) {
        setMessage(res.error === "too_long" ? t("mbv_too_long") : t("mbv_failed"));
        return;
      }
      await navigate({
        to: "/memory-book-create",
        search:
          from === "pages"
            ? { book: bookId, view: "pages" as const, page: page || 1 }
            : { book: bookId, view: "materials" as const },
      });
    } catch {
      setMessage(t("mbv_failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SiteLayout>
      <PageHeader eyebrow={t("brand")} title={t("mbv_title")} />

      <section className="mx-auto w-full max-w-4xl space-y-6 px-4 pb-16 sm:px-6">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          {t("mbv_back")}
        </Button>

        {state === "loading" ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t("mb_admin_loading")}
          </p>
        ) : state === "denied" || !source ? (
          <p className="text-sm text-muted-foreground">{t("mbv_not_found")}</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{t("mbv_hint")}</p>

            <div className="space-y-2">
              <h2 className="text-sm font-semibold">{t("mbv_source")}</h2>
              <video
                ref={player}
                src={source.url}
                controls
                playsInline
                preload="metadata"
                className="w-full rounded-xl bg-black"
                onLoadedMetadata={(e) => {
                  const value = e.currentTarget.duration;
                  if (Number.isFinite(value) && value > 0) setSourceSeconds(value);
                }}
                onTimeUpdate={(e) => {
                  const el = e.currentTarget;
                  setCurrent(el.currentTime);
                  if (stopAt.current != null && el.currentTime >= stopAt.current) {
                    stopAt.current = null;
                    el.pause();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                {formatClock(current)} / {formatClock(sourceSeconds)}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">{t("mbv_fragments")}</h2>
                <Button size="sm" disabled={working} onClick={addFragment}>
                  <Plus className="mr-1 h-4 w-4" aria-hidden />
                  {t("mbv_add")}
                </Button>
              </div>

              <p className={`text-sm ${overLimit ? "text-destructive" : "text-muted-foreground"}`}>
                {fill(t("mbv_total"), {
                  a: formatClock(total),
                  b: formatClock(MEMORY_BOOK_FINAL_VIDEO_MAX_SECONDS),
                })}
              </p>
              {overLimit ? <p className="text-sm text-destructive">{t("mbv_too_long")}</p> : null}

              {fragments.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("mbv_empty")}</p>
              ) : (
                <ul className="space-y-3">
                  {fragments.map((fragment, index) => (
                    <li
                      key={fragment.id}
                      className="space-y-3 rounded-xl border border-border/70 bg-card p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {fill(t("mbv_fragment"), { n: index + 1 })} ·{" "}
                          {formatClock(fragment.end - fragment.start)}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={t("mbv_remove")}
                          disabled={working}
                          onClick={() =>
                            persist(fragments.filter((item) => item.id !== fragment.id))
                          }
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">
                            {t("mbv_start")}: {formatClock(fragment.start)}
                          </label>
                          <input
                            type="range"
                            min={0}
                            max={Math.max(0, sourceSeconds)}
                            step={0.1}
                            value={fragment.start}
                            disabled={working}
                            className="w-full"
                            onChange={(e) =>
                              updateFragment(fragment.id, { start: Number(e.target.value) })
                            }
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={working}
                            onClick={() => updateFragment(fragment.id, { start: current })}
                          >
                            {t("mbv_set_start")}
                          </Button>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">
                            {t("mbv_end")}: {formatClock(fragment.end)}
                          </label>
                          <input
                            type="range"
                            min={0}
                            max={Math.max(0, sourceSeconds)}
                            step={0.1}
                            value={fragment.end}
                            disabled={working}
                            className="w-full"
                            onChange={(e) =>
                              updateFragment(fragment.id, { end: Number(e.target.value) })
                            }
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={working}
                            onClick={() => updateFragment(fragment.id, { end: current })}
                          >
                            {t("mbv_set_end")}
                          </Button>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        disabled={working}
                        onClick={() => playFragment(fragment)}
                      >
                        {t("mbv_play")}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {message ? <p className="text-sm text-destructive">{message}</p> : null}

            {working ? (
              <div className="space-y-1">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  {fill(t("mbv_processing"), { n: progress })}
                </p>
                <p className="text-xs text-muted-foreground">{t("mbv_processing_note")}</p>
              </div>
            ) : (
              <Button
                disabled={fragments.length === 0 || overLimit || saving}
                onClick={() => void runProcess()}
              >
                {t("mbv_process")}
              </Button>
            )}

            {result ? (
              <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-4">
                <h2 className="text-sm font-semibold">
                  {t("mbv_result")} · {formatClock(result.seconds)}
                </h2>
                <p className="text-sm text-muted-foreground">{t("mbv_result_hint")}</p>
                <video src={result.url} controls playsInline className="w-full rounded-xl bg-black" />
                <div className="flex flex-wrap gap-2">
                  <Button disabled={saving} onClick={() => void confirmResult()}>
                    {saving ? t("mbv_saving") : t("mbv_confirm")}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={saving}
                    onClick={() => {
                      URL.revokeObjectURL(result.url);
                      setResult(null);
                    }}
                  >
                    {t("mbv_redo")}
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>
    </SiteLayout>
  );
}
