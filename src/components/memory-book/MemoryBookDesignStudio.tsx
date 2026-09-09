import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import {
  chooseMemoryBookLibraryDesign,
  generateMemoryBookDesign,
  listMemoryBookLibrary,
  loadMemoryBookDesigns,
  purchaseMemoryBookGenerations,
  saveMemoryBookDescription,
  selectMemoryBookDesign,
  setMemoryBookStage,
  type MemoryBookLibraryItem,
} from "@/lib/memory-book/designs.functions";
import { saveMemoryBookPosition } from "@/lib/memory-book/position.functions";
import { MemoryBookMaterials } from "@/components/memory-book/MemoryBookMaterials";
import { MemoryBookPageEditor } from "@/components/memory-book/MemoryBookPageEditor";


import type {
  MemoryBookDesignState,
  MemoryBookStage,
} from "@/lib/memory-book/designs";

function fill(text: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (out, [key, value]) => out.replaceAll(`{${key}}`, String(value)),
    text,
  );
}

/**
 * Cover Design and Leaf Design of ONE already purchased Memory Book. Every
 * variant, description and allowance stays attached to that book.
 */
export function MemoryBookDesignStudio({
  bookId,
  videoCapacity,
  initialView,
  initialPage,
}: {
  bookId: string;
  videoCapacity?: number;
  /** Which part opens first, e.g. when returning from video preparation. */
  initialView?: "design" | "materials" | "pages";
  /** The internal page the customer was working on before leaving. */
  initialPage?: number;
}) {

  const { t } = useI18n();
  const load = useServerFn(loadMemoryBookDesigns);
  const saveDescription = useServerFn(saveMemoryBookDescription);
  const generate = useServerFn(generateMemoryBookDesign);
  const purchase = useServerFn(purchaseMemoryBookGenerations);
  const select = useServerFn(selectMemoryBookDesign);
  const setStage = useServerFn(setMemoryBookStage);
  const loadLibrary = useServerFn(listMemoryBookLibrary);
  const chooseLibrary = useServerFn(chooseMemoryBookLibraryDesign);

  const [state, setState] = useState<MemoryBookDesignState | null>(null);
  const [prompt, setPrompt] = useState("");
  const [shownId, setShownId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [library, setLibrary] = useState<MemoryBookLibraryItem[] | null>(null);
  const [view, setView] = useState<"design" | "materials" | "pages">(initialView ?? "design");
  const savePosition = useServerFn(saveMemoryBookPosition);

  /** Remembers the working position only — no page content is touched. */
  const rememberPosition = useCallback(
    (nextView: "design" | "materials" | "pages", page?: number) => {
      void savePosition({ data: { bookId, view: nextView, page: page ?? null } }).catch(
        () => undefined,
      );
    },
    [bookId, savePosition],
  );

  const rememberPage = useCallback(
    (page: number) => rememberPosition("pages", page),
    [rememberPosition],
  );


  const stage: MemoryBookStage = state?.stage ?? "cover";
  const current = state ? state[stage] : null;

  const apply = useCallback((next: MemoryBookDesignState | undefined | null) => {
    if (!next) return;
    setState(next);
    const active = next[next.stage];
    setPrompt(active.prompt);
    setShownId(
      active.selectedId ?? active.variants[active.variants.length - 1]?.id ?? null,
    );
  }, []);

  useEffect(() => {
    let alive = true;
    load({ data: { bookId } })
      .then((res) => {
        if (alive && res.ok) apply(res.state);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [bookId, load, apply]);

  if (!state || !current) return null;

  const shown = current.variants.find((v) => v.id === shownId) ?? null;
  const selected = current.variants.find((v) => v.id === current.selectedId) ?? null;
  const otherStage: MemoryBookStage = stage === "cover" ? "leaf" : "cover";

  async function runGenerate() {
    if (!prompt.trim()) {
      setMessage(t("mbd_empty_prompt"));
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await generate({ data: { bookId, stage, prompt } });
      apply(res.state);
      if (!res.ok) {
        setMessage(res.error === "empty_prompt" ? t("mbd_empty_prompt") : t("mbd_failed"));
      } else if (res.state) {
        const list = res.state[res.state.stage].variants;
        setShownId(list[list.length - 1]?.id ?? null);
      }
    } catch {
      setMessage(t("mbd_failed"));
    } finally {
      setBusy(false);
    }
  }

  async function runPurchase() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await purchase({
        data: { bookId, stage, purchaseKey: `${bookId}:${stage}:${crypto.randomUUID()}` },
      });
      if (res.ok) apply(res.state);
      else setMessage(res.error === "insufficient_credits" ? t("mbd_no_credits") : t("mbd_failed"));
    } catch {
      setMessage(t("mbd_failed"));
    } finally {
      setBusy(false);
    }
  }

  async function runSelect(designId: string) {
    setBusy(true);
    try {
      const res = await select({ data: { bookId, designId } });
      if (res.ok && res.state) {
        setState(res.state);
        setShownId(designId);
      }
    } finally {
      setBusy(false);
    }
  }

  async function openLibrary() {
    setBusy(true);
    try {
      const res = await loadLibrary({ data: { stage } });
      setLibrary(res.items);
    } catch {
      setLibrary([]);
    } finally {
      setBusy(false);
    }
  }

  async function useLibraryItem(path: string) {
    setBusy(true);
    try {
      const res = await chooseLibrary({ data: { bookId, stage, path } });
      if (res.ok) {
        apply(res.state);
        setLibrary(null);
      }
    } finally {
      setBusy(false);
    }
  }

  async function goToStage(next: MemoryBookStage) {
    setBusy(true);
    try {
      const res = await setStage({ data: { bookId, stage: next } });
      apply(res.state);
      setMessage(null);
    } finally {
      setBusy(false);
    }
  }

  const bothReady = Boolean(state.cover.selectedId && state.leaf.selectedId);

  return (
    <section className="mt-8 space-y-6 text-left">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={view === "design" && stage === "cover" ? "default" : "outline"}
          size="sm"
          disabled={busy || (view === "design" && stage === "cover")}
          onClick={() => {
            setView("design");
            rememberPosition("design");
            void goToStage("cover");
          }}
        >
          {t("mbk_stage_cover")}
          {state.cover.selectedId ? <Check className="ml-1 h-3.5 w-3.5" aria-hidden /> : null}
        </Button>
        <Button
          variant={view === "design" && stage === "leaf" ? "default" : "outline"}
          size="sm"
          disabled={busy || (view === "design" && stage === "leaf")}
          onClick={() => {
            setView("design");
            rememberPosition("design");
            void goToStage("leaf");
          }}
        >
          {t("mbk_stage_leaf")}
          {state.leaf.selectedId ? <Check className="ml-1 h-3.5 w-3.5" aria-hidden /> : null}
        </Button>
        <Button
          variant={view === "materials" ? "default" : "outline"}
          size="sm"
          disabled={busy || view === "materials"}
          onClick={() => {
            setView("materials");
            rememberPosition("materials");
          }}
        >
          {t("mbm_stage")}
        </Button>
        <Button
          variant={view === "pages" ? "default" : "outline"}
          size="sm"
          disabled={busy || view === "pages"}
          onClick={() => {
            setView("pages");
            rememberPosition("pages");
          }}
        >
          {t("mbe_stage")}
        </Button>
      </div>

      {view === "pages" ? (
        <MemoryBookPageEditor
          bookId={bookId}
          initialPage={initialPage}
          onPageChange={rememberPage}
          leafBackgroundUrl={
            state.leaf.variants.find((v) => v.id === state.leaf.selectedId)?.url ?? null
          }
        />
      ) : view === "materials" ? (
        <MemoryBookMaterials bookId={bookId} videoCapacity={videoCapacity} />
      ) : (

        <>
      <div className="space-y-2">

        <h2 className="font-display text-xl font-semibold">
          {stage === "cover" ? t("mbd_cover_title") : t("mbd_leaf_title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {stage === "cover" ? t("mbd_cover_hint") : t("mbd_leaf_hint")}
        </p>
        <p className="text-xs text-muted-foreground">
          {stage === "cover" ? t("mbd_cover_example") : t("mbd_leaf_example")}
        </p>
        <p className="text-xs text-muted-foreground">{t("mbk_saved")}</p>
      </div>


      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="mbd-prompt">
          {t("mbd_description")}
        </label>
        <Textarea
          id="mbd-prompt"
          rows={4}
          value={prompt}
          disabled={busy}
          onChange={(e) => setPrompt(e.target.value)}
          onBlur={() => {
            void saveDescription({ data: { bookId, stage, prompt } }).catch(() => undefined);
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {current.remaining > 0 ? (
          <Button onClick={() => void runGenerate()} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {stage === "cover" ? t("mbd_create_cover") : t("mbd_create_leaf")}
          </Button>
        ) : (
          <Button onClick={() => void runPurchase()} disabled={busy}>
            {t("mbd_buy_more")}
          </Button>
        )}
        <Button variant="outline" onClick={() => void openLibrary()} disabled={busy}>
          {stage === "cover" ? t("mbd_ready_cover") : t("mbd_ready_leaf")}
        </Button>
        <span className="text-sm text-muted-foreground">
          {fill(t("mbd_variants_left"), { n: current.remaining })}
        </span>
      </div>

      {message ? <p className="text-sm text-destructive">{message}</p> : null}

      {shown ? (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-muted/30">
            <img
              src={shown.url}
              alt={stage === "cover" ? t("mbd_cover_title") : t("mbd_leaf_title")}
              className="mx-auto max-h-[520px] w-auto object-contain"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant={current.selectedId === shown.id ? "secondary" : "default"}
              onClick={() => void runSelect(shown.id)}
              disabled={busy || current.selectedId === shown.id}
            >
              {t("mbd_select")}
            </Button>
            {selected ? (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                <Check className="h-4 w-4" aria-hidden />
                {stage === "cover" ? t("mbd_cover_selected") : t("mbd_leaf_selected")}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {current.variants.length > 1 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("mbd_variants")}</p>
          <div className="flex flex-wrap gap-3">
            {current.variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                onClick={() => setShownId(variant.id)}
                className={`h-24 w-20 overflow-hidden rounded-lg border ${
                  variant.id === shownId ? "border-primary" : "border-border/70"
                }`}
              >
                <img src={variant.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 border-t border-border/60 pt-4">
        {stage === "cover" && state.cover.selectedId ? (
          <Button variant="outline" onClick={() => void goToStage("leaf")} disabled={busy}>
            {t("mbd_go_leaf")}
          </Button>
        ) : null}
        {stage === "leaf" ? (
          <Button variant="ghost" onClick={() => void goToStage(otherStage)} disabled={busy}>
            {t("mbd_back_cover")}
          </Button>
        ) : null}
        {bothReady ? <p className="text-sm text-muted-foreground">{t("mbd_ready_next")}</p> : null}
      </div>

        </>
      )}



      {library ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4">
          <div className="max-h-[80vh] w-full max-w-3xl overflow-auto rounded-2xl border border-border/70 bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">{t("mbd_library_title")}</h3>
              <Button variant="ghost" onClick={() => setLibrary(null)}>
                {t("mbd_close")}
              </Button>
            </div>
            {library.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("mbd_library_empty")}</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {library.map((item) => (
                  <div key={item.path} className="space-y-2">
                    <img
                      src={item.url}
                      alt=""
                      className="h-40 w-full rounded-lg border border-border/60 object-cover"
                    />
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={busy}
                      onClick={() => void useLibraryItem(item.path)}
                    >
                      {t("mbd_use")}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
