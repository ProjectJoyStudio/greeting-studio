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
import { loadMemoryBookMaterials } from "@/lib/memory-book/materials.functions";
import { uploadMemoryBookVideo } from "@/lib/memory-book/video-upload";
import { createMemoryBookVideoUpload } from "@/lib/memory-book/video-storage.functions";
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
  const loadMaterials = useServerFn(loadMemoryBookMaterials);

  const player = useRef<HTMLVideoElement | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopAt = useRef<number | null>(null);

  const [state, setState] = useState<"loading" | "ready" | "denied">("loading");
  /** The first source is always the video the customer entered through. */
  const [sources, setSources] = useState<MemoryBookMaterial[]>([]);
  const [activeId, setActiveId] = useState<string>(materialId);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [fragments, setFragments] = useState<MemoryBookVideoFragment[]>([]);
  const [current, setCurrent] = useState(0);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ url: string; blob: Blob; extension: string; mime: string; seconds: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState<MemoryBookMaterial[] | null>(null);
  const [pickerBusy, setPickerBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!bookId || !materialId) {
      setState("denied");
      return;
    }
    loadEdit({ data: { bookId, materialId } })
      .then(async (res) => {
        if (!alive) return;
        if (!res.ok || !res.source) {
          setState("denied");
          return;
        }
        const first = res.source;
        setSources([first]);
        setActiveId(first.id);
        setDurations({ [first.id]: first.durationSeconds ?? 0 });
        setFragments(res.fragments);
        setState("ready");

        // Sources used by earlier chosen parts are brought back automatically.
        const extra = Array.from(
          new Set(
            res.fragments
              .map((fragment) => fragment.sourceId)
              .filter((id): id is string => Boolean(id) && id !== first.id),
          ),
        );
        if (extra.length === 0) return;
        const list = await loadMaterials({ data: { bookId } }).catch(() => null);
        if (!alive || !list?.ok) return;
        const found = list.materials.filter(
          (item) => item.kind === "video" && extra.includes(item.id),
        );
        if (found.length === 0) return;
        setSources((prev) => [...prev, ...found.filter((item) => !prev.some((p) => p.id === item.id))]);
        setDurations((prev) => {
          const next = { ...prev };
          for (const item of found) next[item.id] = item.durationSeconds ?? 0;
          return next;
        });
      })
      .catch(() => {
        if (alive) setState("denied");
      });
    return () => {
      alive = false;
    };
  }, [bookId, materialId, loadEdit, loadMaterials]);

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

  const source = sources.find((item) => item.id === activeId) ?? sources[0] ?? null;
  const sourceIdOf = (fragment: MemoryBookVideoFragment) => fragment.sourceId ?? materialId;
  const secondsOf = (id: string) =>
    durations[id] ?? sources.find((item) => item.id === id)?.durationSeconds ?? 0;
  const sourceSeconds = source ? secondsOf(source.id) : 0;
  const nameOf = (id: string) => sources.find((item) => item.id === id)?.fileName || "";

  async function openPicker() {
    setPickerBusy(true);
    try {
      const res = await loadMaterials({ data: { bookId } });
      setPicker(
        res.ok
          ? res.materials.filter(
              (item) => item.kind === "video" && !sources.some((s) => s.id === item.id),
            )
          : [],
      );
    } catch {
      setPicker([]);
    } finally {
      setPickerBusy(false);
    }
  }

  /** Uses an already uploaded video of THIS book — nothing is uploaded twice. */
  function addSource(material: MemoryBookMaterial) {
    setSources((prev) => (prev.some((s) => s.id === material.id) ? prev : [...prev, material]));
    setDurations((prev) => ({ ...prev, [material.id]: material.durationSeconds ?? 0 }));
    setActiveId(material.id);
    setPicker((prev) => (prev ? prev.filter((item) => item.id !== material.id) : prev));
  }

  function addFragment() {
    if (!source) return;
    const limit = secondsOf(source.id);
    const start = Math.min(current, Math.max(0, limit - MEMORY_BOOK_FRAGMENT_MIN_SECONDS));
    const end = Math.min(limit, start + 15);
    persist([
      ...fragments,
      clampFragment({ id: newId(), sourceId: source.id, start, end }, limit),
    ]);
  }

  function updateFragment(id: string, patch: Partial<MemoryBookVideoFragment>) {
    persist(
      fragments.map((fragment) =>
        fragment.id === id
          ? clampFragment({ ...fragment, ...patch }, secondsOf(sourceIdOf(fragment)))
          : fragment,
      ),
    );
  }

  /** Moves one boundary by exactly one second, never past the 5 minute total. */
  function nudge(fragment: MemoryBookVideoFragment, edge: "start" | "end", delta: 1 | -1) {
    const value = fragment[edge] + delta;
    const others = total - (fragment.end - fragment.start);
    const room = MEMORY_BOOK_FINAL_VIDEO_MAX_SECONDS - others;
    const limit = secondsOf(sourceIdOf(fragment));
    const wanted =
      edge === "start"
        ? { start: Math.min(Math.max(0, value), fragment.end - MEMORY_BOOK_FRAGMENT_MIN_SECONDS) }
        : { end: Math.min(value, limit, fragment.start + Math.max(0, room)) };
    if (edge === "start" && fragment.end - (wanted.start ?? 0) > room) {
      wanted.start = Math.max(wanted.start ?? 0, fragment.end - Math.max(0, room));
    }
    updateFragment(fragment.id, wanted);
  }

  function playFragment(fragment: MemoryBookVideoFragment) {
    const owner = sourceIdOf(fragment);
    if (owner !== activeId) {
      setActiveId(owner);
      return;
    }
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
      const urls: Record<string, string> = {};
      for (const item of sources) urls[item.id] = item.url;
      const firstUrl = sources[0]?.url ?? source.url;
      const prepared = await joinVideoFragments(
        firstUrl,
        fragments,
        (ratio) => setProgress(Math.round(ratio * 100)),
        urls,
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
      // The finished video is stored first; only a really stored file may be
      // registered, and only then may the sources be cleaned up.
      const stored = await uploadMemoryBookVideo(createUpload, {
        bookId,
        role: "prepared",
        data: result.blob,
        fileName: `prepared.${result.extension}`,
        contentType: result.mime,
        fallbackPath: path,
      });
      if (!stored) throw new Error("upload_failed");

      // Only the source videos that really gave parts to this result.
      const used = Array.from(new Set(fragments.map((fragment) => sourceIdOf(fragment))));

      const res = await registerPrepared({
        data: {
          bookId,
          sourceMaterialId: materialId,
          sourceMaterialIds: used,
          path: stored.path,
          storage: stored.storage,
          fileName: `${sources[0]?.fileName ?? "video"} (${formatClock(result.seconds)})`,
          mimeType: result.mime,
          sizeBytes: result.blob.size,
          durationSeconds: result.seconds,
        },
      });
      // Nothing is treated as saved until the stored record comes back.
      if (!res.ok || !res.materialId) {
        setMessage(res.error === "too_long" ? t("mbv_too_long") : t("mbv_failed"));
        return;
      }
      URL.revokeObjectURL(result.url);
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

      <section className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-16 sm:px-6">
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

            {/* Editing workspace: source on the left, chosen parts on the right. */}
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
              <div className="space-y-2 lg:sticky lg:top-24 lg:self-start">
                <div className="rounded-xl border border-border/70 bg-card p-3">
                  <p
                    className={`text-sm font-medium ${overLimit ? "text-destructive" : ""}`}
                  >
                    {fill(t("mbv_total"), {
                      a: formatClock(total),
                      b: formatClock(MEMORY_BOOK_FINAL_VIDEO_MAX_SECONDS),
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {fill(t("mbv_left"), {
                      a: formatClock(Math.max(0, MEMORY_BOOK_FINAL_VIDEO_MAX_SECONDS - total)),
                    })}
                  </p>
                </div>
                <h2 className="text-sm font-semibold">{t("mbv_source")}</h2>

                {sources.length > 1 ? (
                  <div className="flex flex-wrap gap-2">
                    {sources.map((item, index) => (
                      <Button
                        key={item.id}
                        size="sm"
                        variant={item.id === source.id ? "default" : "outline"}
                        disabled={working}
                        onClick={() => setActiveId(item.id)}
                      >
                        {item.fileName || fill(t("mbv_source_n"), { n: index + 1 })}
                      </Button>
                    ))}
                  </div>
                ) : null}

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={working || pickerBusy}
                  onClick={() => void openPicker()}
                >
                  {t("mbv_add_source")}
                </Button>

                <video
                  key={source.id}
                  ref={player}
                  src={source.url}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full rounded-xl bg-black"
                  onLoadedMetadata={(e) => {
                    const value = e.currentTarget.duration;
                    if (Number.isFinite(value) && value > 0) {
                      setDurations((prev) => ({ ...prev, [source.id]: value }));
                    }
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
                <Button
                  size="sm"
                  className="w-full"
                  disabled={working}
                  onClick={addFragment}
                >
                  <Plus className="mr-1 h-4 w-4" aria-hidden />
                  {t("mbv_add")}
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold">{t("mbv_fragments")}</h2>
                </div>


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

                        {sources.length > 1 ? (
                          <p className="text-xs text-muted-foreground">
                            {fill(t("mbv_from_source"), {
                              name: nameOf(sourceIdOf(fragment)) || t("mbv_source"),
                            })}
                          </p>
                        ) : null}

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">
                              {t("mbv_start")}: {formatClock(fragment.start)}
                            </label>
                            <input
                              type="range"
                              min={0}
                              max={Math.max(0, secondsOf(sourceIdOf(fragment)))}
                              step={0.1}
                              value={fragment.start}
                              disabled={working}
                              className="w-full"
                              onChange={(e) =>
                                updateFragment(fragment.id, { start: Number(e.target.value) })
                              }
                            />
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={working}
                                onClick={() => nudge(fragment, "start", -1)}
                              >
                                {t("mbv_minus1")}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={working}
                                onClick={() => nudge(fragment, "start", 1)}
                              >
                                {t("mbv_plus1")}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={working || sourceIdOf(fragment) !== source.id}
                                onClick={() => updateFragment(fragment.id, { start: current })}
                              >
                                {t("mbv_set_start")}
                              </Button>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">
                              {t("mbv_end")}: {formatClock(fragment.end)}
                            </label>
                            <input
                              type="range"
                              min={0}
                              max={Math.max(0, secondsOf(sourceIdOf(fragment)))}
                              step={0.1}
                              value={fragment.end}
                              disabled={working}
                              className="w-full"
                              onChange={(e) =>
                                updateFragment(fragment.id, { end: Number(e.target.value) })
                              }
                            />
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={working}
                                onClick={() => nudge(fragment, "end", -1)}
                              >
                                {t("mbv_minus1")}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={working}
                                onClick={() => nudge(fragment, "end", 1)}
                              >
                                {t("mbv_plus1")}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={working || sourceIdOf(fragment) !== source.id}
                                onClick={() => updateFragment(fragment.id, { end: current })}
                              >
                                {t("mbv_set_end")}
                              </Button>
                            </div>
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

            {picker ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
                <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-2xl border border-border/70 bg-card p-6">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="font-display text-lg font-semibold">{t("mbv_add_source")}</h3>
                    <Button variant="ghost" onClick={() => setPicker(null)}>
                      {t("mbv_pick_close")}
                    </Button>
                  </div>
                  {picker.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("mbv_pick_empty")}</p>
                  ) : (
                    <ul className="space-y-3">
                      {picker.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3"
                        >
                          <span className="min-w-0 truncate text-sm">
                            {item.fileName || "video"}
                            {item.durationSeconds
                              ? ` · ${formatClock(item.durationSeconds)}`
                              : ""}
                          </span>
                          <Button size="sm" onClick={() => addSource(item)}>
                            {t("mbv_pick_use")}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>
    </SiteLayout>
  );
}
