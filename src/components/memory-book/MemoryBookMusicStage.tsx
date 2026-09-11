import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Music, Pause, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import {
  chooseMemoryBookLibraryTrack,
  clearMemoryBookMusic,
  createMemoryBookMusic,
  listMemoryBookMusicLibrary,
  loadMemoryBookMusic,
  selectMemoryBookMusicVariant,
} from "@/lib/memory-book/music.functions";
import type { MemoryBookMusicState } from "@/lib/memory-book/music";
import { MUSIC_CATEGORIES } from "@/lib/music/types";

function fill(text: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (out, [key, value]) => out.replaceAll(`{${key}}`, String(value)),
    text,
  );
}

interface LibraryTrack {
  id: string;
  title: string;
  category: string;
  durationSeconds: number;
  url: string | null;
}

/**
 * The Music stage of ONE purchased Memory Book: either a track of the shared
 * Project Joy library, or a composition created for this exact book.
 */
export function MemoryBookMusicStage({ bookId }: { bookId: string }) {
  const { t } = useI18n();
  const load = useServerFn(loadMemoryBookMusic);
  const listLibrary = useServerFn(listMemoryBookMusicLibrary);
  const chooseTrack = useServerFn(chooseMemoryBookLibraryTrack);
  const createMusic = useServerFn(createMemoryBookMusic);
  const selectVariant = useServerFn(selectMemoryBookMusicVariant);
  const clearMusic = useServerFn(clearMemoryBookMusic);

  const [state, setState] = useState<MemoryBookMusicState | null>(null);
  const [tab, setTab] = useState<"library" | "create">("library");
  const [tracks, setTracks] = useState<LibraryTrack[] | null>(null);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Customer-side browsing helper only: "all" is never stored on a track.
  const [category, setCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const used = new Set((tracks ?? []).map((track) => track.category));
    return MUSIC_CATEGORIES.filter((c) => used.has(c));
  }, [tracks]);

  const visibleTracks = useMemo(
    () =>
      category === "all"
        ? (tracks ?? [])
        : (tracks ?? []).filter((track) => track.category === category),
    [tracks, category],
  );

  useEffect(() => {
    let active = true;
    void load({ data: { bookId } }).then((res) => {
      if (!active) return;
      if (res.state) {
        setState(res.state);
        if (res.state.source === "created") setTab("create");
      }
    });
    return () => {
      active = false;
    };
  }, [bookId, load]);

  useEffect(() => {
    if (tab !== "library" || tracks) return;
    void listLibrary({ data: {} } as never).then((res) => setTracks(res.tracks));
  }, [tab, tracks, listLibrary]);

  // Only one preview sounds at a time, and it never survives leaving the page.
  const preview = useCallback((key: string, url: string | null) => {
    if (!url) return;
    const el = audioRef.current;
    if (el && playing === key) {
      el.pause();
      setPlaying(null);
      return;
    }
    if (el) el.pause();
    const next = new Audio(url);
    audioRef.current = next;
    next.onended = () => setPlaying(null);
    void next.play().catch(() => setPlaying(null));
    setPlaying(key);
  }, [playing]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      audioRef.current = null;
    },
    [],
  );

  if (!state) {
    return (
      <p className="text-sm text-muted-foreground">
        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden />
        {t("mb_admin_loading")}
      </p>
    );
  }

  const onCreate = async () => {
    if (!prompt.trim()) {
      setMessage(t("mbmu_empty_prompt"));
      return;
    }
    setBusy(true);
    setMessage(t("mbmu_creating"));
    const res = await createMusic({
      data: { bookId, prompt, claimKey: crypto.randomUUID() },
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      setMessage(
        res?.error === "insufficient_credits"
          ? t("mbmu_no_credits")
          : res?.error === "empty_prompt"
            ? t("mbmu_empty_prompt")
            : t("mbmu_failed"),
      );
      if (res?.state) setState(res.state);
      return;
    }
    if (res.state) setState(res.state);
    setMessage(res.mode === "paid" ? t("mbmu_paid_done") : null);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="font-display text-xl font-semibold">{t("mbmu_title")}</h2>
        <p className="text-sm text-muted-foreground">{t("mbmu_hint")}</p>
        <p className="text-xs text-muted-foreground">{t("mbmu_saved")}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={tab === "library" ? "default" : "outline"}
          size="sm"
          disabled={busy}
          onClick={() => setTab("library")}
        >
          {t("mbmu_source_library")}
        </Button>
        <Button
          variant={tab === "create" ? "default" : "outline"}
          size="sm"
          disabled={busy}
          onClick={() => setTab("create")}
        >
          {t("mbmu_source_create")}
        </Button>
        {state.source !== "none" ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const res = await clearMusic({ data: { bookId } }).catch(() => null);
              setBusy(false);
              if (res?.state) setState(res.state);
            }}
          >
            {t("mbmu_remove")}
          </Button>
        ) : null}
      </div>

      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}

      {tab === "library" ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{t("mbmu_library_free")}</p>
          {tracks === null ? (
            <p className="text-sm text-muted-foreground">{t("mus_loading")}</p>
          ) : tracks.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("mbmu_library_empty")}</p>
          ) : (
            <ul className="space-y-2">
              {tracks.map((track) => {
                const chosen = state.source === "library" && state.trackId === track.id;
                return (
                  <li
                    key={track.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-card p-3"
                  >
                    <Music className="h-4 w-4 text-primary" aria-hidden />
                    <span className="flex-1 text-sm font-medium">{track.title}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => preview(`t-${track.id}`, track.url)}
                    >
                      {playing === `t-${track.id}` ? (
                        <>
                          <Pause className="mr-1 h-3.5 w-3.5" aria-hidden />
                          {t("mbmu_pause")}
                        </>
                      ) : (
                        <>
                          <Play className="mr-1 h-3.5 w-3.5" aria-hidden />
                          {t("mbmu_play")}
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      disabled={busy || chosen}
                      onClick={async () => {
                        setBusy(true);
                        const res = await chooseTrack({
                          data: { bookId, trackId: track.id },
                        }).catch(() => null);
                        setBusy(false);
                        if (res?.state) setState(res.state);
                      }}
                    >
                      {chosen ? t("mbmu_chosen") : t("mbmu_choose")}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="mb-music-prompt">
              {t("mbmu_describe")}
            </label>
            <Textarea
              id="mb-music-prompt"
              value={prompt}
              rows={4}
              placeholder={t("mbmu_describe_example")}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={busy}
            />
            <p className="text-xs text-muted-foreground">{t("mbmu_length")}</p>
            <p className="text-xs text-muted-foreground">
              {state.remaining > 0
                ? fill(t("mbmu_included_left"), { n: state.remaining })
                : fill(t("mbmu_paid_note"), { n: state.priceCredits })}
            </p>
          </div>
          <Button onClick={() => void onCreate()} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            {t("mbmu_create")}
          </Button>

          {state.variants.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">{t("mbmu_variants")}</h3>
              <ul className="space-y-2">
                {state.variants.map((variant, index) => {
                  const chosen = state.source === "created" && state.variantId === variant.id;
                  return (
                    <li
                      key={variant.id}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-card p-3"
                    >
                      <Music className="h-4 w-4 text-primary" aria-hidden />
                      <span className="flex-1 text-sm font-medium">
                        {fill(t("mbmu_variant"), { n: index + 1 })}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => preview(`v-${variant.id}`, variant.url)}
                      >
                        {playing === `v-${variant.id}` ? (
                          <>
                            <Pause className="mr-1 h-3.5 w-3.5" aria-hidden />
                            {t("mbmu_pause")}
                          </>
                        ) : (
                          <>
                            <Play className="mr-1 h-3.5 w-3.5" aria-hidden />
                            {t("mbmu_play")}
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        disabled={busy || chosen}
                        onClick={async () => {
                          setBusy(true);
                          const res = await selectVariant({
                            data: { bookId, variantId: variant.id },
                          }).catch(() => null);
                          setBusy(false);
                          if (res?.state) setState(res.state);
                        }}
                      >
                        {chosen ? t("mbmu_selected") : t("mbmu_use")}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
