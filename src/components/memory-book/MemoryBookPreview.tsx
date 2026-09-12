import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { loadMemoryBookMusic, setMemoryBookMusicPlayback } from "@/lib/memory-book/music.functions";
import type { MemoryBookMaterial } from "@/lib/memory-book/materials";
import { loadMemoryBookMaterials } from "@/lib/memory-book/materials.functions";
import type { MemoryBookDecoration } from "@/lib/memory-book/decorations";
import { listMemoryBookDecorations } from "@/lib/memory-book/decorations.functions";
import type { MemoryBookPage } from "@/lib/memory-book/pages";
import { loadMemoryBookPages } from "@/lib/memory-book/pages.functions";
import { loadMemoryBookDesigns } from "@/lib/memory-book/designs.functions";
import {
  loadMemoryBookLeafOrder,
  saveMemoryBookLeafOrder,
} from "@/lib/memory-book/leaf-order.functions";
import { MemoryBookBook, type MemoryBookBookData } from "./MemoryBookBook";

function fill(text: string, vars: Record<string, string | number>) {
  return Object.entries(vars).reduce(
    (out, [key, value]) => out.replaceAll(`{${key}}`, String(value)),
    text,
  );
}

/**
 * Interactive preview of the assembled Memory Book. It only READS the saved
 * state of the customer's book: nothing is generated, charged, completed or
 * changed here, apart from the order of the leaves the customer chooses.
 *
 * The book itself lives in MemoryBookBook, which receives already-loaded data;
 * this component is only the part that fetches and saves.
 */
export function MemoryBookPreview({ bookId }: { bookId: string }) {
  const { t } = useI18n();
  const loadPages = useServerFn(loadMemoryBookPages);
  const loadMaterials = useServerFn(loadMemoryBookMaterials);
  const loadLibrary = useServerFn(listMemoryBookDecorations);
  const loadDesigns = useServerFn(loadMemoryBookDesigns);
  const loadOrder = useServerFn(loadMemoryBookLeafOrder);
  const loadMusic = useServerFn(loadMemoryBookMusic);
  const saveMusicPlayback = useServerFn(setMemoryBookMusicPlayback);
  const saveOrder = useServerFn(saveMemoryBookLeafOrder);

  const [ready, setReady] = useState(false);
  const [ok, setOk] = useState(false);
  const [pages, setPages] = useState<Record<number, MemoryBookPage>>({});
  const [materials, setMaterials] = useState<MemoryBookMaterial[]>([]);
  const [library, setLibrary] = useState<MemoryBookDecoration[]>([]);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [backCoverUrl, setBackCoverUrl] = useState<string | null>(null);
  const [leafBackgroundUrl, setLeafBackgroundUrl] = useState<string | null>(null);
  const [order, setOrder] = useState<number[]>([]);
  const [orderMessage, setOrderMessage] = useState<string | null>(null);
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [musicVolume, setMusicVolume] = useState(0.35);

  // The preview always reads the CURRENT saved book. Opening it changes
  // nothing about the project's lifecycle.
  useEffect(() => {
    let alive = true;
    void Promise.all([
      loadPages({ data: { bookId } }),
      loadMaterials({ data: { bookId } }),
      loadLibrary({ data: undefined }),
      loadDesigns({ data: { bookId } }),
      loadOrder({ data: { bookId } }),
    ])
      .then(([p, m, d, designs, o]) => {
        if (!alive) return;
        if (p.ok) {
          const map: Record<number, MemoryBookPage> = {};
          for (const page of p.pages) map[page.pageIndex] = page;
          setPages(map);
          setOk(true);
        }
        if (m.ok) setMaterials(m.materials);
        setLibrary(d.decorations);
        const state = designs.ok ? designs.state : null;
        if (state) {
          setCoverUrl(
            state.cover.variants.find((v) => v.id === state.cover.selectedId)?.url ?? null,
          );
          setBackCoverUrl(state.backCover.url);
          setLeafBackgroundUrl(
            state.leaf.variants.find((v) => v.id === state.leaf.selectedId)?.url ?? null,
          );
        }
        if (o.ok) setOrder(o.order);
        setReady(true);
      })
      .catch(() => setReady(true));
    return () => {
      alive = false;
    };
  }, [bookId, loadPages, loadMaterials, loadLibrary, loadDesigns, loadOrder]);

  // The chosen composition of this book, if there is one.
  useEffect(() => {
    let active = true;
    void loadMusic({ data: { bookId } })
      .then((res) => {
        if (!active || !res.state) return;
        setMusicUrl(res.state.selectedUrl);
        setMusicEnabled(res.state.enabled);
        setMusicVolume(res.state.volume);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [bookId, loadMusic]);

  const data = useMemo<MemoryBookBookData>(
    () => ({
      pages,
      order,
      materials,
      library,
      coverUrl,
      backCoverUrl,
      leafBackgroundUrl,
      musicUrl,
      musicEnabled,
      musicVolume,
    }),
    [
      pages,
      order,
      materials,
      library,
      coverUrl,
      backCoverUrl,
      leafBackgroundUrl,
      musicUrl,
      musicEnabled,
      musicVolume,
    ],
  );

  async function moveLeaf(index: number, direction: -1 | 1) {
    const next = [...order];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    setOrder(next);
    setOrderMessage(null);
    try {
      const res = await saveOrder({ data: { bookId, order: next } });
      setOrderMessage(res.ok ? t("mbpv_order_saved") : t("mbpv_order_failed"));
      if (res.ok) setOrder(res.order);
    } catch {
      setOrderMessage(t("mbpv_order_failed"));
    }
  }

  if (!ready) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        {t("mbpv_loading")}
      </p>
    );
  }
  if (!ok) return <p className="text-sm text-muted-foreground">{t("mbpv_not_found")}</p>;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t("mbpv_hint")}</p>

      <MemoryBookBook
        data={data}
        onMusicEnabledChange={(enabled) => {
          setMusicEnabled(enabled);
          void saveMusicPlayback({ data: { bookId, enabled } }).catch(() => undefined);
        }}
        onMusicVolumeChange={(volume) => {
          setMusicVolume(volume);
          void saveMusicPlayback({ data: { bookId, volume } }).catch(() => undefined);
        }}
      />

      {/* Order of the leaves — both pages of a leaf always move together. */}
      <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-4">
        <h2 className="font-display text-lg font-semibold">{t("mbpv_order_title")}</h2>
        <p className="text-sm text-muted-foreground">{t("mbpv_order_hint")}</p>
        <ul className="space-y-2">
          {order.map((leaf, index) => (
            <li
              key={leaf}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2"
            >
              <span className="text-sm">{fill(t("mbpv_leaf"), { n: leaf })}</span>
              <span className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={index === 0}
                  onClick={() => void moveLeaf(index, -1)}
                >
                  {t("mbpv_move_up")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={index === order.length - 1}
                  onClick={() => void moveLeaf(index, 1)}
                >
                  {t("mbpv_move_down")}
                </Button>
              </span>
            </li>
          ))}
        </ul>
        {orderMessage ? <p className="text-sm text-muted-foreground">{orderMessage}</p> : null}
      </div>
    </div>
  );
}
